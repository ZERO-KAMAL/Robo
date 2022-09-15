import { BigNumber, ethers } from "./ethers-5.6.esm.min.js";

const CONTRACT_ADDRESS = "0x057169c194CaFe6A0E9f8D29800BDF8941840c4A";
const NETWORK = "homestead";
const ETHERSCAN_KEY = "S69BJU6NPGWAMW9AS513ATM93EQI2A1FHQ";
const INFURA_ID = "aee71abd85214d2289b445bc76ef26b2";
const NETWORK_CHAIN = "0x1";

console.log(`contract address: ${CONTRACT_ADDRESS}`);
console.log(`network: ${NETWORK}`);
console.log(`NETWORK_CHAIN: ${NETWORK_CHAIN}`);

let contractAbi;
await $.getJSON("./json/Robottoz.json", function (data) {
  contractAbi = data.abi;
});

const userProvider = new ethers.providers.Web3Provider(window.ethereum, "any");

async function requestNetworkChange() {
  await userProvider.send("wallet_switchEthereumChain", [{ chainId: NETWORK_CHAIN }]);
}

const provider = ethers.getDefaultProvider(NETWORK, {
  etherscan: ETHERSCAN_KEY,
  infura: INFURA_ID,
});

const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

userProvider.on("network", async (newNetwork, oldNetwork) => {
  if (newNetwork.name !== NETWORK) {
    await requestNetworkChange();
  }
  if (oldNetwork) {
    window.location.reload();
  }
});

const mintPrice = await readOnlyContract.price();
const totalSupply = await readOnlyContract.totalSupply();
const maxMintPerTx = await readOnlyContract.maxMintPerTx();
const maxFree = await readOnlyContract.maxFree();
let signer;
let signerContract;
let userAddress;
let hasMinted;
let connected = false;
let open = await readOnlyContract.open();

const mainButton = document.getElementById("main-button");
const amountInput = document.getElementById("amountInput");

async function connectWallet() {
  try {
    await userProvider.send("eth_requestAccounts", []);
  } catch (e) {
    console.log(e);
    window.location.reload();
  }
  signer = userProvider.getSigner();
  if (signer) {
    connected = true;
  }
  signerContract = readOnlyContract.connect(signer);
  userAddress = await userProvider.getSigner().getAddress();
  hasMinted = await signerContract.balanceOf(userAddress);

  mainButton.textContent = "Mint";
}

async function mint() {
  const selectedMintAmount = amountInput.value;

  console.log("mint");
  console.log(selectedMintAmount);

  if (userProvider.network.name !== NETWORK) {
    await requestNetworkChange();
    return;
  }
  if (selectedMintAmount <= 0) {
    return;
  }
  if (selectedMintAmount > maxMintPerTx) {
    return;
  }

  let amount = BigNumber.from(selectedMintAmount);
  let etherToSent = mintPrice.mul(selectedMintAmount);

  if (hasMinted.eq(0)) {
    etherToSent = etherToSent.sub(mintPrice.mul(maxFree));
  }

  if (hasMinted.eq(0)) {
    etherToSent = etherToSent.sub(mintPrice.mul(maxFree));
  }

  console.log(etherToSent);

  if (etherToSent < 0) {
    etherToSent = 0;
  }

  const overrides = { value: etherToSent };

  try {
    await signerContract.mint(amount, overrides);
  } catch (e) {
    console.log(e);
  }
}

document.getElementById("main-button").addEventListener("click", async () => {
  if (!connected) {
    await connectWallet();
  } else {
    await mint();
  }
});

document.getElementById("minted").textContent = totalSupply !== undefined ? totalSupply : "";
