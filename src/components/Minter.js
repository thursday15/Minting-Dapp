import { useEffect, useState } from "react";
import Web3 from "web3";
import contract from "../contracts/contract.json";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Hero from "../assets/hero.png";

const initialInfoState = {
  connected: false,
  status: null,
  account: null,
  web3: null,
  contract: null,
  address: null,
  contractJSON: null,
};

const initialMintState = {
  loading: false,
  status: `Mint your ${contract.name}`,
  amount: 1,
  supply: "0",
  cost: "0",
};

function Minter() {
  const [info, setInfo] = useState(initialInfoState);
  const [mintInfo, setMintInfo] = useState(initialMintState);

  console.log(info);

  const init = async (_request, _contractJSON) => {
    try {
      const providerOptions = {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            rpc: {
              80001: "https://polygon-mumbai.g.alchemy.com/v2/spCORotdKi4K2op0x1kuehPkvzCnfb71",
            },
            chainId: 80001
          },
        },
      };
      const web3Modal = new Web3Modal({
        networkId: _contractJSON.chainId,
        cacheProvider: false,
        providerOptions,
      });
      const provider = await web3Modal.connect();
      const web3 = new Web3(provider);
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      if (networkId === _contractJSON.chainId) {
        setInfo((prevState) => ({
          ...prevState,
          connected: true,
          status: null,
          account: accounts[0],
          web3: web3,
          contract: new web3.eth.Contract(
            _contractJSON.abi,
            _contractJSON.address
          ),
          contractJSON: _contractJSON,
        }));
      } else {
        setInfo(() => ({
          ...initialInfoState,
          status: "Please install metamask or other wallet with WalletConnect support.",
        }));
      }
      provider.on("accountsChanged", (accounts) => {
        setInfo((prevState) => ({
          ...prevState,
          account: accounts[0],
        }));
      });

      provider.on("chainChanged", (chainId) => {
        window.location.reload(chainId);
      });

      provider.on("disconnect", () => {
        setInfo(initialInfoState);
        web3Modal.clearCachedProvider();
      });
    } catch (err) {
      console.log(err.message);
      setInfo(() => ({
        ...initialInfoState,
      }));
    }
  };

  const initListeners = () => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        window.location.reload(accounts[0]);
      });
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  };

  const getSupply = async () => {
    const params = {
      to: info.contractJSON.address,
      from: info.account,
      data: info.contract.methods.totalSupply().encodeABI(),
    };
    try {
      const result = await info.web3.eth.call(params);
      console.log(info.web3.utils.hexToNumberString(result));
      setMintInfo((prevState) => ({
        ...prevState,
        supply: info.web3.utils.hexToNumberString(result),
      }));
    } catch (err) {
      setMintInfo((prevState) => ({
        ...prevState,
        supply: 0,
      }));
    }
  };

  const getCost = async () => {
    const params = {
      to: info.contractJSON.address,
      from: info.account,
      data: info.contract.methods.price().encodeABI(),
    };
    try {
      const result = await info.web3.eth.call(params);
      console.log(info.web3.utils.hexToNumberString(result));
      setMintInfo((prevState) => ({
        ...prevState,
        cost: info.web3.utils.hexToNumberString(result),
      }));
    } catch (err) {
      setMintInfo((prevState) => ({
        ...prevState,
        cost: "0",
      }));
    }
  };

  const mint = async () => {
    const params = {
      to: info.contractJSON.address,
      from: info.account,
      value: String(
        info.web3.utils.toHex(Number(mintInfo.cost) * mintInfo.amount)
      ),
      data: info.contract.methods
        .PublicMint(mintInfo.amount)
        .encodeABI(),
    };
    try {
      setMintInfo((prevState) => ({
        ...prevState,
        loading: true,
        status: `Minting ${mintInfo.amount}...`,
      }));
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [params],
      });
      setMintInfo((prevState) => ({
        ...prevState,
        loading: false,
        status:
          "Nice! Your NFT will show up on Opensea, once the transaction is successful.",
      }));
      getSupply();
    } catch (err) {
      setMintInfo((prevState) => ({
        ...prevState,
        loading: false,
        status:err.message,
      }));
    }
  };

  const updateAmount = (newAmount) => {
    if (newAmount <= 5 && newAmount >= 1) {
      setMintInfo((prevState) => ({
        ...prevState,
        amount: newAmount,
      }));
    }
  };

  const connectToContract = (_contractJSON) => {
    init("eth_requestAccounts", _contractJSON);
  };

  useEffect(() => {
    connectToContract(contract);
    initListeners();
  }, []);

  useEffect(() => {
    if (info.connected) {
      getSupply();
      getCost();
    }
  }, [info.connected]);

  return (
    <div className="page">
      <div className="card">
        <div className="card_header colorGradient">
          <img className="card_header_image ns" alt={"banner"} src={Hero} />
        </div>
        {mintInfo.supply < contract.total_supply ? (
          <div className="card_body">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                disabled={!info.connected || mintInfo.cost === "0"}
                className="small_button"
                onClick={() => updateAmount(mintInfo.amount - 1)}
              >
                -
              </button>
              <div style={{ width: 10 }}></div>
              <button
                disabled={!info.connected || mintInfo.cost === "0"}
                className="button"
                onClick={() => mint()}
              >
                Mint {mintInfo.amount}
              </button>
              <div style={{ width: 10 }}></div>
              <button
                disabled={!info.connected || mintInfo.cost === "0"}
                className="small_button"
                onClick={() => updateAmount(mintInfo.amount + 1)}
              >
                +
              </button>
            </div>
            {info.connected ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ color: "var(--statusText)", textAlign: "center" }}>
                  {info.web3?.utils.fromWei(mintInfo.cost, "ether") *
                    mintInfo.amount}{" "}
                  {contract.chain_symbol}
                </p>
                <div style={{ width: 20 }}></div>
                <p style={{ color: "var(--statusText)", textAlign: "center" }}>
                  |
                </p>
                <div style={{ width: 20 }}></div>
                <p style={{ color: "var(--statusText)", textAlign: "center" }}>
                  {mintInfo.supply}/{contract.total_supply}
                </p>
              </div>
            ) : null}
            {mintInfo.status ? (
              <p className="statusText">{mintInfo.status}</p>
            ) : null}
            {info.status ? (
              <p className="statusText" style={{ color: "var(--error)" }}>
                {info.status}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="card_body">
            <p style={{ color: "var(--statusText)", textAlign: "center" }}>
              {mintInfo.supply}/{contract.total_supply}
            </p>
            <p className="statusText">
              We've sold out! .You can still buy and trade the {contract.name}{" "}
              on marketplaces such as Opensea.
            </p>
          </div>
        )}
        <div className="card_footer colorGradient">
          <button
            className="button"
            style={{
              backgroundColor: info.connected
                ? "var(--success)"
                : "var(--warning)",
            }}
            onClick={() => connectToContract(contract)}
          >
            {info.account ? "Connected" : "Connect Wallet"}  
          </button>
          {info.connected ? (
            <span className="accountText">
              {String(info.account).substring(0, 6) +
                "..." +
                String(info.account).substring(38)}
            </span>
          ) : null}
        </div>
        <a
          style={{
            position: "absolute",
            bottom: 55,
            left: -75,
          }}
          className="_90"
          target="_blank"
          rel="noreferrer"
          href="https://polygonscan.com/token/0xe24C18eC0A647c942b2bb239893E73f38c5dE4bB"
        >
          View Contract
        </a>
      </div>
    </div>
  );
}

export default Minter;  