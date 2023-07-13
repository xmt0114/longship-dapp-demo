import { providers } from "ethers";
import { Web3ReactProvider } from "@web3-react/core";
import { Outlet, useLocation } from "umi";
import styles from "./index.less";

function getLibrary(provider: any): providers.Web3Provider {
  return new providers.Web3Provider(provider);
}

export default function Layout() {

  const location = useLocation();
    return (
      <div className={styles.container}>
          {location.pathname === "/web3React" || location.pathname === "/web3React1" ? (
              <Web3ReactProvider getLibrary={getLibrary}>
                <Outlet/>
              </Web3ReactProvider>
          ) : <Outlet/>
          }
      </div>
  )
}
