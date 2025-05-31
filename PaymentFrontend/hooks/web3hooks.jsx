import React,{ useState, useEffect } from "react";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { ethers } from "ethers";

const clientId = window.APP_SETTINGS.REACT_APP_WEB3AUTH_CLIENT_ID;

export const useWeb3Auth = () => {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState(null);

  useEffect(() => {
    const initWeb3Auth = async () => {
      try {
        const web3authInstance = new Web3Auth({
          clientId,
          chainConfig: {
          chainNamespace: "eip155",
    chainId: "0x13881", // Polygon Mumbai
     rpcTarget: window.APP_SETTINGS.REACT_APP_WEB3AUTH_RPC,
          },
        });

        const openloginAdapter = new OpenloginAdapter({
          adapterSettings: {
            network: "testnet",
            uxMode: "popup",
          },
        });

        web3authInstance.configureAdapter(openloginAdapter);
        await web3authInstance.initModal();

        setWeb3auth(web3authInstance);
        if (web3authInstance.provider) {
          setProvider(web3authInstance.provider);
          const signer = new ethers.providers.Web3Provider(web3authInstance.provider).getSigner();
          const addr = await signer.getAddress();
          setAddress(addr);
        }
      } catch (err) {
        console.error("Web3Auth init error", err);
      }
    };

    initWeb3Auth();
  }, []);

  const login = async () => {
    if (!web3auth) return;
    const provider = await web3auth.connect();
    setProvider(provider);

    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();
    const addr = await signer.getAddress();
    setAddress(addr);
  };

  const logout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setProvider(null);
    setAddress(null);
  };

  return {
    login,
    logout,
    address,
    provider,
  };
};
