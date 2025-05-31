import React,{ useEffect, useState } from "react";
import { ethers } from "ethers";
import {  createSmartAccountClient } from "@biconomy/account";
import { ChainId } from "@biconomy/core-types";

export const useBiconomyWallet = () => {
  const [smartAccount, setSmartAccount] = useState(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    const init = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const smartWallet = await createSmartAccountClient({
        signer,
       chainId: 80001, // Polygon Mumbai (replace with 137 for mainnet if needed)
   bundlerUrl : window.APP_SETTINGS.REACT_APP_BICONOMY_BUNDLER_URL,
  //paymasterUrl: process.env.REACT_APP_BICONOMY_PAYMASTER_URL,
  entryPointAddress: window.APP_SETTINGS.REACT_APP_BICONOMY_ENTRYPOINT,
      });

      const address = await smartWallet.getAddress();
      setSmartAccount(smartWallet);
      setAddress(address);
    };

    init();
  }, []);

  return { smartAccount, address };
};
