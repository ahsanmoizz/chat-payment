import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { BiconomySmartAccount, createSmartAccountClient } from "@biconomy/account";
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
        chainId: ChainId.POLYGON_MUMBAI, // Or mainnet id like 137
        bundlerUrl: process.env.REACT_APP_BICONOMY_BUNDLER,
        paymasterUrl: process.env.REACT_APP_BICONOMY_PAYMASTER,
        entryPointAddress: process.env.REACT_APP_BICONOMY_ENTRYPOINT,
      });

      const address = await smartWallet.getAddress();
      setSmartAccount(smartWallet);
      setAddress(address);
    };

    init();
  }, []);

  return { smartAccount, address };
};
