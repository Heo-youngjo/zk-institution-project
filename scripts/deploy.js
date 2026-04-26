const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // 02_build_tree.js에서 나온 root를 decimal string으로 넣기
  const root = "0x249910b514bb9e96cbf64a5b44c597528b8bd7d7fb0ead7e93f10ef9d8fe7bf3";

  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  console.log("Verifier deployed:", verifier.address);

  const Registry = await hre.ethers.getContractFactory("Registry");
  const registry = await Registry.deploy(root, verifier.address);
  await registry.deployed();

  console.log("Registry deployed:", registry.address);

  const OrderGateway = await hre.ethers.getContractFactory("OrderGateway");
  const orderGateway = await OrderGateway.deploy(registry.address);
  await orderGateway.deployed();

  console.log("OrderGateway deployed:", orderGateway.address);

  const deployed = {
    verifier: verifier.address,
    registry: registry.address,
    orderGateway: orderGateway.address,
    root
  };

  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  fs.writeFileSync("./data/deployed.json", JSON.stringify(deployed, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});