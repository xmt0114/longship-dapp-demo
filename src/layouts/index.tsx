import { providers } from "ethers";
import { Web3ReactProvider } from "@web3-react/core";
import { Web3OnboardProvider } from "@web3-onboard/react";
import web3Onboard from "@/pages/Web3OnboardDemo/web3-onboard";
import { Outlet, useLocation } from "umi";
import styles from "./index.less";

function getLibrary(provider: any): providers.Web3Provider {
  return new providers.Web3Provider(provider);
}

export default function Layout() {

  const location = useLocation();

  function renderContent() {
    if (location.pathname === "/web3React" || location.pathname === "/web3React1") {
      return <Web3ReactProvider getLibrary={getLibrary}>
        <Outlet />
      </Web3ReactProvider>
    }
    if (location.pathname === '/web3onboard') {
      return <Web3OnboardProvider web3Onboard={web3Onboard}>
        <Outlet />
      </Web3OnboardProvider>
    }
    return <Outlet />;
  }

  return (
    <div className={styles.container}>
      {renderContent()}
    </div>
  )
}
