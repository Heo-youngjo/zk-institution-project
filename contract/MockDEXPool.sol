// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function mint(address to, uint256 amount) external; // 테스트용 토큰만
}

/**
 * @title  MockDEXPool
 * @notice Hardhat 로컬 테스트 전용 DEX 풀 시뮬레이터.
 *         고정 환율 + 설정 가능한 슬리피지로 스왑을 흉내 낸다.
 *
 * 실제 배포 시에는 Uniswap V2/V3 래퍼(UniswapV2Adapter.sol)로 교체.
 *
 * 파라미터:
 *   priceRateBps  : tokenIn 1단위당 tokenOut 수량 (bps 배율, 기본 10000 = 1:1)
 *   feeBps        : 스왑 수수료 (기본 30 = 0.3%)
 *   impactBps     : 주문 규모에 비례한 추가 슬리피지 시뮬레이션 (기본 0)
 */
contract MockDEXPool {

    uint256 public constant BPS_DENOM = 10000;

    address public owner;
    string  public poolName;

    // 환율 설정: amountOut = amountIn * priceRateBps / 10000
    uint256 public priceRateBps = 10000; // default 1:1
    uint256 public feeBps       = 30;    // 0.3% fee
    uint256 public impactBps    = 0;     // 추가 price impact (테스트용)

    event Swapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
    event PriceUpdated(uint256 oldRate, uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(string memory _name, uint256 _priceRateBps, uint256 _feeBps) {
        owner        = msg.sender;
        poolName     = _name;
        priceRateBps = _priceRateBps;
        feeBps       = _feeBps;
    }

    // ── IDEXPool 인터페이스 구현 ────────────────────────────────────────────

    function getAmountOut(
        uint256 amountIn,
        address, /* tokenIn  - 이 mock에서는 무시 */
        address  /* tokenOut - 이 mock에서는 무시 */
    ) external view returns (uint256 amountOut) {
        uint256 afterFee = amountIn * (BPS_DENOM - feeBps) / BPS_DENOM;
        amountOut        = afterFee * priceRateBps / BPS_DENOM;
        // price impact 시뮬레이션
        if (impactBps > 0) {
            amountOut = amountOut * (BPS_DENOM - impactBps) / BPS_DENOM;
        }
    }

    function swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address recipient
    ) external returns (uint256 amountOut) {
        // 1) tokenIn 수취
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // 2) amountOut 계산
        uint256 afterFee = amountIn * (BPS_DENOM - feeBps) / BPS_DENOM;
        amountOut        = afterFee * priceRateBps / BPS_DENOM;
        if (impactBps > 0) {
            amountOut = amountOut * (BPS_DENOM - impactBps) / BPS_DENOM;
        }

        // 3) 슬리피지 가드
        require(amountOut >= amountOutMin, "Slippage exceeded");

        // 4) tokenOut 전송 (이 컨트랙트가 충분한 tokenOut 잔고를 가지고 있어야 함)
        //    테스트 환경에서는 MockERC20.mint()로 풀에 미리 충전
        require(
            IERC20(tokenOut).balanceOf(address(this)) >= amountOut,
            "Pool: insufficient tokenOut liquidity"
        );
        IERC20(tokenOut).transfer(recipient, amountOut);

        emit Swapped(tokenIn, tokenOut, amountIn, amountOut, recipient);
    }

    // ── 관리 함수 ───────────────────────────────────────────────────────────

    function setPriceRate(uint256 _rateBps) external onlyOwner {
        emit PriceUpdated(priceRateBps, _rateBps);
        priceRateBps = _rateBps;
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee > 10%");
        feeBps = _feeBps;
    }

    function setImpact(uint256 _impactBps) external onlyOwner {
        impactBps = _impactBps;
    }
}
