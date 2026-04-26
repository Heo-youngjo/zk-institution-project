/**
 * deploy_executor.js
 *
 * 실행:
 *   npx hardhat run scripts/deploy_executor.js --network localhost
 *
 * 전제조건:
 *   - Hardhat node가 이미 실행 중 (npx hardhat node)
 *   - data/deployed.json 에 registry 주소가 있어야 함
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYED_PATH = path.join(__dirname, "../data/deployed.json");

async function main() {
  const [deployer, institution] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // ── 기존 배포 정보 로드 ──────────────────────────────────────────────────
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_PATH));
  const registryAddr = deployed.registry;
  console.log("Registry:", registryAddr);

  // ── 1. MockERC20 배포 (tokenIn: USDC 시뮬, tokenOut: WETH 시뮬) ─────────
  const ERC20 = await ethers.getContractFactory("MockERC20");

  const tokenIn  = await ERC20.deploy("Mock USDC", "mUSDC");
  await tokenIn.deployed();
  console.log("MockUSDC (tokenIn) :", tokenIn.address);

  const tokenOut = await ERC20.deploy("Mock WETH", "mWETH");
  await tokenOut.deployed();
  console.log("MockWETH (tokenOut):", tokenOut.address);

  // ── 2. MockDEXPool 3개 배포 ──────────────────────────────────────────────
  //    priceRateBps: 1 USDC → 0.0004 WETH (≈ WETH 2500 USDC 기준)
  //    실제로는 비율이 다를 수 있음; 여기선 데모 단순화
  const DEXPool = await ethers.getContractFactory("MockDEXPool");

  const pool1 = await DEXPool.deploy("UniswapV3-Sim",  4,  30); // fee 0.3%
  const pool2 = await DEXPool.deploy("CurveFi-Sim",    4,  4);  // fee 0.04%
  const pool3 = await DEXPool.deploy("Balancer-Sim",   4,  10); // fee 0.1%
  await pool1.deployed();
  await pool2.deployed();
  await pool3.deployed();
  console.log("Pool1 (UniswapV3-Sim) :", pool1.address);
  console.log("Pool2 (CurveFi-Sim)   :", pool2.address);
  console.log("Pool3 (Balancer-Sim)  :", pool3.address);

  // ── 3. 각 풀에 tokenOut 유동성 공급 (100 mWETH) ──────────────────────────
  const LIQUIDITY = ethers.utils.parseEther("100");
  await tokenOut.mint(pool1.address, LIQUIDITY);
  await tokenOut.mint(pool2.address, LIQUIDITY);
  await tokenOut.mint(pool3.address, LIQUIDITY);
  console.log("Liquidity minted to each pool:", ethers.utils.formatEther(LIQUIDITY), "mWETH");

  // ── 4. 기관에 테스트용 tokenIn 지급 (1,000,000 mUSDC) ───────────────────
  const INSTITUTION_BALANCE = ethers.utils.parseEther("1000000");
  await tokenIn.mint(institution.address, INSTITUTION_BALANCE);
  console.log("Minted", ethers.utils.formatEther(INSTITUTION_BALANCE), "mUSDC to institution:", institution.address);

  // ── 5. OrderExecutor 배포 ────────────────────────────────────────────────
  const Executor = await ethers.getContractFactory("OrderExecutor");
  const executor = await Executor.deploy(registryAddr);
  await executor.deployed();
  console.log("OrderExecutor:", executor.address);

  // ── 6. 풀 등록 ──────────────────────────────────────────────────────────
  await executor.addPool(pool1.address);
  await executor.addPool(pool2.address);
  await executor.addPool(pool3.address);
  console.log("Pools registered in OrderExecutor");

  // ── 7. deployed.json 업데이트 ────────────────────────────────────────────
  deployed.orderExecutor = executor.address;
  deployed.pool1         = pool1.address;
  deployed.pool2         = pool2.address;
  deployed.pool3         = pool3.address;
  deployed.tokenIn       = tokenIn.address;
  deployed.tokenOut      = tokenOut.address;
  fs.writeFileSync(DEPLOYED_PATH, JSON.stringify(deployed, null, 2));
  console.log("\n✅ deployed.json 업데이트 완료");
  console.log(JSON.stringify(deployed, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
