// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
//  인터페이스
// ─────────────────────────────────────────────────────────────────────────────

interface IRegistry {
    function isLoggedIn(address user) external view returns (bool);
}

interface IOrderGateway {
    function submitOrder(uint256 amount) external;
}

/// @dev DEX 풀 공통 인터페이스 (MockDEXPool / Uniswap V2 스타일 래퍼와 호환)
interface IDEXPool {
    /// @return amountOut  주어진 amountIn 에 대한 예상 수령량
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amountOut);

    /// @dev 실제 스왑 실행. amountOutMin 이하면 revert
    function swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address recipient
    ) external returns (uint256 amountOut);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// ─────────────────────────────────────────────────────────────────────────────
//  OrderExecutor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @title  OrderExecutor
 * @notice 허가된 기관(ZK 로그인)이 제출한 대량 주문을 여러 청크로 분할하여
 *         등록된 DEX 풀에 순차·라운드로빈 방식으로 집행한다.
 *
 * 흐름:
 *   1. createOrder()  → 분할 파라미터 설정, 주문 등록
 *   2. executeChunk() → 청크 하나씩 집행 (오프체인 봇 또는 유저가 호출)
 *   3. (또는) executeAll() → 전체 청크를 한 트랜잭션에서 순차 집행 (가스 주의)
 *   4. cancelOrder()  → 만료·미집행 주문 취소 + 잔여 토큰 반환
 */
contract OrderExecutor {

    // ── 상수 ──────────────────────────────────────────────────────────────────
    uint256 public constant MAX_SPLITS     = 20;    // 최대 분할 청크 수
    uint256 public constant MAX_SLIPPAGE   = 1000;  // 최대 슬리피지 10% (bps)
    uint256 public constant BPS_DENOM      = 10000;

    // ── 상태 ──────────────────────────────────────────────────────────────────
    IRegistry     public registry;
    address       public owner;
    uint256       public nextOrderId;

    /// @dev 등록된 DEX 풀 목록 (라운드로빈 라우팅)
    address[]     public dexPools;
    mapping(address => bool) public isRegisteredPool;

    // ── 데이터 모델 ────────────────────────────────────────────────────────────
    enum Status { PENDING, PARTIAL, FILLED, CANCELLED, EXPIRED }

    struct ExecutionOrder {
        uint256   id;
        address   user;
        address   tokenIn;       // 팔 토큰
        address   tokenOut;      // 살 토큰
        uint256   totalAmount;   // 팔 전체 수량
        uint256   splitCount;    // 분할 청크 수
        uint256   chunkSize;     // 청크 당 수량 (= totalAmount / splitCount)
        uint256   slippageBps;   // 허용 슬리피지 (e.g. 50 = 0.5%)
        uint256   deadline;      // 집행 만료 unix timestamp
        uint256   filledChunks;  // 집행 완료된 청크 수
        uint256   totalIn;       // 실제 집행된 tokenIn 합계
        uint256   totalOut;      // 실제 수령한 tokenOut 합계
        Status    status;
    }

    struct Fill {
        uint256   orderId;
        uint256   chunkIndex;   // 0-based
        address   dexPool;
        uint256   amountIn;
        uint256   amountOut;
        uint256   executedAt;
        uint256   slippageActualBps; // 실제 슬리피지
    }

    mapping(uint256 => ExecutionOrder)  public orders;
    mapping(uint256 => Fill[])          public fills;       // orderId → Fill[]
    mapping(address => uint256[])       public userOrders;  // user → orderId[]

    // ── 이벤트 ─────────────────────────────────────────────────────────────────
    event OrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 totalAmount,
        uint256 splitCount,
        uint256 deadline
    );
    event ChunkExecuted(
        uint256 indexed orderId,
        uint256 chunkIndex,
        address dexPool,
        uint256 amountIn,
        uint256 amountOut
    );
    event OrderFilled(uint256 indexed orderId, uint256 totalIn, uint256 totalOut);
    event OrderCancelled(uint256 indexed orderId, uint256 refundAmount);
    event OrderExpired(uint256 indexed orderId);
    event PoolAdded(address pool);
    event PoolRemoved(address pool);

    // ── 모디파이어 ──────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyLoggedIn() {
        require(registry.isLoggedIn(msg.sender), "Session inactive: ZK login required");
        _;
    }

    // ── 생성자 ──────────────────────────────────────────────────────────────────
    constructor(address _registry) {
        owner    = msg.sender;
        registry = IRegistry(_registry);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  풀 관리 (owner 전용)
    // ─────────────────────────────────────────────────────────────────────────

    function addPool(address pool) external onlyOwner {
        require(!isRegisteredPool[pool], "Already registered");
        dexPools.push(pool);
        isRegisteredPool[pool] = true;
        emit PoolAdded(pool);
    }

    function removePool(address pool) external onlyOwner {
        require(isRegisteredPool[pool], "Not registered");
        isRegisteredPool[pool] = false;
        // 배열에서 제거 (순서 유지 불필요 → swap & pop)
        for (uint256 i = 0; i < dexPools.length; i++) {
            if (dexPools[i] == pool) {
                dexPools[i] = dexPools[dexPools.length - 1];
                dexPools.pop();
                break;
            }
        }
        emit PoolRemoved(pool);
    }

    function poolCount() external view returns (uint256) {
        return dexPools.length;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  주문 생성
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice 주문 생성 및 tokenIn 에스크로
     * @param tokenIn      팔 토큰 주소
     * @param tokenOut     살 토큰 주소
     * @param totalAmount  전체 판매 수량
     * @param splitCount   분할 청크 수 (1 ~ MAX_SPLITS)
     * @param slippageBps  허용 슬리피지 (0 ~ MAX_SLIPPAGE)
     * @param deadline     집행 만료 unix timestamp
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 totalAmount,
        uint256 splitCount,
        uint256 slippageBps,
        uint256 deadline
    ) external onlyLoggedIn returns (uint256 orderId) {
        // ── 입력 검증 ──
        require(tokenIn != tokenOut,          "Same token");
        require(totalAmount > 0,              "Zero amount");
        require(splitCount >= 1 && splitCount <= MAX_SPLITS, "Invalid split count");
        require(slippageBps <= MAX_SLIPPAGE,  "Slippage too high");
        require(deadline > block.timestamp,   "Deadline in past");
        require(dexPools.length > 0,          "No DEX pools registered");

        // ── 청크 크기 계산 ──
        uint256 chunkSize = totalAmount / splitCount;
        require(chunkSize > 0, "Chunk too small");

        // ── tokenIn 에스크로 (컨트랙트로 이체) ──
        uint256 actualTotal = chunkSize * splitCount; // 나머지 버림
        IERC20(tokenIn).transferFrom(msg.sender, address(this), actualTotal);

        // ── 주문 등록 ──
        orderId = ++nextOrderId;
        orders[orderId] = ExecutionOrder({
            id:           orderId,
            user:         msg.sender,
            tokenIn:      tokenIn,
            tokenOut:     tokenOut,
            totalAmount:  actualTotal,
            splitCount:   splitCount,
            chunkSize:    chunkSize,
            slippageBps:  slippageBps,
            deadline:     deadline,
            filledChunks: 0,
            totalIn:      0,
            totalOut:     0,
            status:       Status.PENDING
        });
        userOrders[msg.sender].push(orderId);

        emit OrderCreated(orderId, msg.sender, tokenIn, tokenOut, actualTotal, splitCount, deadline);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  단일 청크 집행
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice 다음 미집행 청크를 라운드로빈으로 DEX에 라우팅
     * @dev    오프체인 집행봇이 주기적으로 호출하거나 유저가 직접 호출
     * @param  orderId  집행할 주문 ID
     */
    function executeChunk(uint256 orderId) public returns (uint256 amountOut) {
        ExecutionOrder storage o = orders[orderId];

        // ── 상태 검증 ──
        require(o.id != 0,                      "Order not found");
        require(o.status == Status.PENDING || o.status == Status.PARTIAL, "Not executable");
        require(block.timestamp <= o.deadline,   "Order expired");

        // ── 라운드로빈으로 풀 선택 ──
        address pool = _selectPool(o.filledChunks);

        // ── 슬리피지 하한 계산 ──
        uint256 expectedOut  = IDEXPool(pool).getAmountOut(o.chunkSize, o.tokenIn, o.tokenOut);
        uint256 minAmountOut = expectedOut * (BPS_DENOM - o.slippageBps) / BPS_DENOM;

        // ── 풀에 approve 후 스왑 ──
        IERC20(o.tokenIn).approve(pool, o.chunkSize);
        amountOut = IDEXPool(pool).swap(
            o.chunkSize,
            minAmountOut,
            o.tokenIn,
            o.tokenOut,
            o.user          // 수령자는 주문을 낸 기관
        );

        // ── 실제 슬리피지 기록 ──
        uint256 actualSlipBps = expectedOut > amountOut
            ? (expectedOut - amountOut) * BPS_DENOM / expectedOut
            : 0;

        uint256 chunkIdx = o.filledChunks;
        fills[orderId].push(Fill({
            orderId:             orderId,
            chunkIndex:          chunkIdx,
            dexPool:             pool,
            amountIn:            o.chunkSize,
            amountOut:           amountOut,
            executedAt:          block.timestamp,
            slippageActualBps:   actualSlipBps
        }));

        // ── 상태 갱신 ──
        o.filledChunks += 1;
        o.totalIn      += o.chunkSize;
        o.totalOut     += amountOut;

        if (o.filledChunks >= o.splitCount) {
            o.status = Status.FILLED;
            emit OrderFilled(orderId, o.totalIn, o.totalOut);
        } else {
            o.status = Status.PARTIAL;
        }

        emit ChunkExecuted(orderId, chunkIdx, pool, o.chunkSize, amountOut);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  전체 청크 일괄 집행 (가스 주의: splitCount가 클 때 사용 지양)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice 남은 모든 청크를 한 트랜잭션에서 순차 집행
     * @dev    데모/테스트 환경에서 편리; 프로덕션은 executeChunk 반복 권장
     */
    function executeAll(uint256 orderId) external returns (uint256 totalOut) {
        ExecutionOrder storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(o.status == Status.PENDING || o.status == Status.PARTIAL, "Not executable");

        uint256 remaining = o.splitCount - o.filledChunks;
        for (uint256 i = 0; i < remaining; i++) {
            if (block.timestamp > o.deadline) {
                o.status = Status.EXPIRED;
                emit OrderExpired(orderId);
                break;
            }
            totalOut += executeChunk(orderId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  주문 취소 (만료 또는 유저 요청)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice 미집행 잔여 청크를 취소하고 tokenIn 환불
     * @dev    주문 소유자 또는 만료 후 누구나 호출 가능
     */
    function cancelOrder(uint256 orderId) external {
        ExecutionOrder storage o = orders[orderId];
        require(o.id != 0, "Order not found");
        require(
            o.status == Status.PENDING || o.status == Status.PARTIAL,
            "Not cancellable"
        );
        require(
            msg.sender == o.user || block.timestamp > o.deadline,
            "Not authorized"
        );

        uint256 refund = (o.splitCount - o.filledChunks) * o.chunkSize;
        o.status = block.timestamp > o.deadline ? Status.EXPIRED : Status.CANCELLED;

        if (refund > 0) {
            IERC20(o.tokenIn).transfer(o.user, refund);
        }

        emit OrderCancelled(orderId, refund);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  조회 함수
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice 특정 주문의 전체 체결(Fill) 목록
    function getFills(uint256 orderId) external view returns (Fill[] memory) {
        return fills[orderId];
    }

    /// @notice 유저의 전체 주문 ID 목록
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /// @notice 남은 미집행 청크 수
    function remainingChunks(uint256 orderId) external view returns (uint256) {
        ExecutionOrder storage o = orders[orderId];
        if (o.status == Status.FILLED || o.status == Status.CANCELLED || o.status == Status.EXPIRED) {
            return 0;
        }
        return o.splitCount - o.filledChunks;
    }

    /// @notice 주문 진행 상황 요약 (프론트엔드용)
    function getOrderSummary(uint256 orderId) external view returns (
        address user,
        uint256 totalAmount,
        uint256 splitCount,
        uint256 filledChunks,
        uint256 totalOut,
        uint256 deadline,
        Status  status
    ) {
        ExecutionOrder storage o = orders[orderId];
        return (o.user, o.totalAmount, o.splitCount, o.filledChunks, o.totalOut, o.deadline, o.status);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  내부 함수
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev 라운드로빈: 청크 인덱스를 풀 개수로 나눈 나머지 → 풀 선택
     *      활성 풀이 없으면 revert
     */
    function _selectPool(uint256 chunkIndex) internal view returns (address) {
        uint256 len = dexPools.length;
        require(len > 0, "No pools");
        // 비활성 풀 건너뛰기 (removePool 후 남은 슬롯 방어)
        for (uint256 i = 0; i < len; i++) {
            address candidate = dexPools[(chunkIndex + i) % len];
            if (isRegisteredPool[candidate]) return candidate;
        }
        revert("No active pool");
    }

    // ── owner 유틸 ──────────────────────────────────────────────────────────
    function setRegistry(address _registry) external onlyOwner {
        registry = IRegistry(_registry);
    }
}
