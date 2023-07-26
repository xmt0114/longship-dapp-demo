import { useState, useEffect, useMemo } from 'react';
import { ethers } from "ethers";
import { TransactionResponse } from '@ethersproject/providers';
import { useConnectWallet } from "@web3-onboard/react";
import { Form, Input, AutoComplete, message, Modal, Select, Layout, Button, Card, Space } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { CopyToClipboard } from "react-copy-to-clipboard";
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import { SiweMessage } from 'siwe';
import { showOmitAccount } from '@/utils/utils';
import { getLongshipModule, injected } from './web3-onboard';
import { eip712DemoData, EOA, token } from "@/config";
import erc20Token from '@/erc20Token';
import ERC20ABI from '@/contract/abi/ERC20.json';
import ERC721ABI from '@/contract/abi/ERC721.json';
import MyERC721ABI from '@/contract/abi/myERC721.json';
import styles from './index.less';

const { Sider, Content } = Layout;
const { TextArea } = Input;

const isProd = window.origin.includes('traitsniper');

const Web3OnboardDemo = () => {

  const [{ wallet, connecting }, connect, disconnect, _, setWalletModules] = useConnectWallet();

  const [provider, setProvider] = useState<ethers.providers.Web3Provider>();
  const [networksValue, setNetworksValue] = useState<'bsc' | 'testnet'>(isProd ? 'bsc' : 'testnet');
  const [networkOptions, setNetworkOptions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>();

  const [sendNativeLoading, setSendNativeLoading] = useState(false);
  const [sendERC20Loading, setSendERC20Loading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [sendERC721Loading, setSendERC721Loading] = useState(false);
  const [mintERC721Loading, setMintERC721Loading] = useState(false);
  const [signPersonalLoading, setSignPersonalLoading] = useState(false);
  const [signTypedLoading, setSignTypedLoading] = useState(false);
  const [siweSignLoading, setSiweSignLoading] = useState(false);

  const [erc721Owner, setERC721Owner] = useState('');
  const [signature, setSignature] = useState('');
  const [typedData, setTypedData] = useState(eip712DemoData);
  const [typedSignature, setTypedSignature] = useState('');
  const [siweMessage, setSiweMessage] = useState<SiweMessage>();
  const [siweResult, setSiweResult] = useState<string>();

  const account = wallet && wallet.accounts[0].address;
  const signer = provider && provider.getSigner();

  const [erc20Form] = Form.useForm();
  const [erc721Form] = Form.useForm();

  const erc20ContractOptions = useMemo(() => {
    return erc20Token[networksValue].map((token) => ({
      label: token.contract_address,
      value: token.contract_address
    }))
  }, [networksValue]);

  const getChains = async () => {
    const options = isProd ? ['bsc'] : ['testnet', 'bsc']
    setNetworkOptions(options.map(t => ({
      label: t,
      value: t
    })))
  };

  async function handleTransactionResponse(res: TransactionResponse, successCallback?: Function) {
    console.log('tx res', res);
    const receipt = await res.wait();
    console.log('receipt', receipt);
    if (receipt.status === 1) {
      successCallback?.();
    }
    Modal.success({
      title: receipt.status === 1 ? 'Success' : 'Fail',
      content: <>
        Transaction Hash: <br />
        {receipt.transactionHash}
      </>
    });
  }

  function getNativeBalance() {
    if (provider && wallet?.accounts[0]) {
      provider?.getBalance(wallet?.accounts[0].address).then((res) => {
        setBalance(ethers.utils.formatEther(res));
      });
    }
  }

  async function sendNativeToken(values: any) {
    if (account && signer) {
      const txParams = {
        from: account,
        to: values.address,
        value: ethers.utils.parseEther(values.amount),
        data: "0x",
      };
      try {
        setSendNativeLoading(true);
        const txResp = await signer.sendTransaction(txParams);
        await handleTransactionResponse(txResp, getNativeBalance);
      } catch (e: any) {
        console.log(e);
        message.error(`send transaction error: ${e.message}`);
        getNativeBalance();
      } finally {
        setSendNativeLoading(false);
      }
    }
  }

  async function sendERC20Token(values: any) {
    if (account && provider && signer) {
      setSendERC20Loading(true);
      const erc20 = new ethers.Contract(values.contractAddress, ERC20ABI, provider);
      const decimals = await erc20.decimals();
      const callData = new ethers.utils.Interface(ERC20ABI).encodeFunctionData(
        'transfer',
        [values.address, ethers.utils.parseUnits(values.amount, decimals)]
      );
      try {
        const txResp = await signer.sendTransaction({
          from: account,
          to: values.contractAddress,
          value: '0x0',
          data: callData,
        });
        await handleTransactionResponse(txResp);
      } catch (e: any) {
        // updateERC20TokenBalance();
        message.error(e.message);
      } finally {
        setSendERC20Loading(false);
      }
    }
  }
  async function approveERC20(values: any) {
    if (account && signer) {
      setApproveLoading(true);
      const erc20 = new ethers.Contract(values.contractAddress, ERC20ABI, signer);
      const balance = await erc20.balanceOf(account);
      const spenderAddress = values.spender || '0x981C0774dFf527feBC014084b4d5300483812601'; // Address of the spender

      try {
        const tx = await erc20.approve(spenderAddress, balance);
        await handleTransactionResponse(tx);
      } catch (e: any) {
        console.error(e);
        message.error(e.message);
      } finally {
        setApproveLoading(false);
      }
    }
  }

  async function sendERC721Token(values: any) {
    if (account && signer) {
      setSendERC721Loading(true);
      const callData = new ethers.utils.Interface(ERC721ABI).encodeFunctionData(
        'transferFrom',
        [account, values.address, values.tokenId]
      );
      try {
        const txResp = await signer.sendTransaction({
          from: account,
          to: values.contractAddress,
          value: '0x0',
          data: callData,
        });
        await handleTransactionResponse(txResp);
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setSendERC721Loading(false);
      }
    }
  }
  async function getERC721OwnerOf(values: any) {
    if (provider) {
      setERC721Owner('');
      try {
        const erc721 = new ethers.Contract(values.contractAddress, MyERC721ABI, provider);
        const address = await erc721.ownerOf(Number(values.tokenId));
        setERC721Owner(address);
      } catch (e: any) {
        message.error(e.message);
        setERC721Owner('');
      }
    }
  }

  async function mintERC721Token(values: any) {
    if (signer) {
      setMintERC721Loading(true);
      const erc721 = new ethers.Contract(values.contractAddress, MyERC721ABI, signer);
      try {
        const tx = await erc721.mint(values.address, values.tokenId);
        await handleTransactionResponse(tx);
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setMintERC721Loading(false);
      }
    }
  }

  async function signPersonalMessage(values: any) {
    if (signer) {
      setSignPersonalLoading(true);
      try {
        const res = await signer.signMessage(values.message);
        message.success('sign success');
        setSignature(res);
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setSignPersonalLoading(false);
      }
    }
  }
  async function signTypedData() {
    if (signer) {
      setSignTypedLoading(true);
      try {
        const signature = await signer._signTypedData(
          typedData.domain,
          typedData.types,
          typedData.message
        );
        message.success('sign success');
        setTypedSignature(signature);
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setSignTypedLoading(false);
      }
    }
  }

  async function siweSign() {
    if (account && signer) {
      setSiweSignLoading(true);
      const siweMessage: SiweMessage = new SiweMessage({
        domain: window.location.host,
        address: account,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: 1
      });
      setSiweMessage(siweMessage);
      const msg = siweMessage.prepareMessage();
      try {
        const res = await signer.signMessage(msg);
        setSiweResult(res);
      } catch (e: any) {
        message.error(e.message);
      } finally {
        setSiweSignLoading(false);
      }
    }
  }
  useEffect(() => {
    getChains();
  }, []);
  useEffect(() => {
    const longship = getLongshipModule({chainType: networksValue});
    setWalletModules([injected, longship]);
  }, [networksValue]);
  useEffect(() => {
    if (wallet?.provider) {
      setProvider(new ethers.providers.Web3Provider(wallet.provider, "any"));
    } else {
      setProvider(undefined);
    }
  }, [wallet]);

  useEffect(() => {
    getNativeBalance();
  }, [provider]);

  return (
    <Layout className={styles.layout}>
      <Content className={styles.content}>
        <h2>Able Network</h2>
        <h3>Transaction</h3>
        <Card bordered title={`Send ${networksValue === 'bsc' ? 'BNB' : 'ETH'}`} className={styles.card}>
          <Form
            name="eth"
            onFinish={sendNativeToken}
            autoComplete="off"
            disabled={!wallet}
          >
            <Form.Item
              label="Receive address"
              name="address"
              rules={[{ required: true, message: 'Please input address!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Token amount"
              name="amount"
              rules={[{ required: true, message: 'Please input token amount!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={sendNativeLoading}>
                Send
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card bordered title="Send ERC20 Token" className={styles.card}>
          <Form
            name="sendERC20"
            onFinish={sendERC20Token}
            autoComplete="off"
            disabled={!wallet}
            initialValues={{
              spender: '0x981C0774dFf527feBC014084b4d5300483812601',
              contractAddress: erc20ContractOptions[0].value
            }}
            form={erc20Form}
          >
            <Form.Item
              label="Receive address"
              name="address"
              rules={[{ required: true, message: 'Please input address!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Contract address"
              name="contractAddress"
              rules={[{ required: true, message: 'Please input contract address!' }]}
            >
              <AutoComplete
                options={erc20ContractOptions}
              >
                <Input />
              </AutoComplete>
            </Form.Item>
            <Form.Item
              label="Token amount"
              name="amount"
              rules={[{ required: true, message: 'Please input token amount!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="approve spender" name="spender">
              <AutoComplete
                options={[...erc20ContractOptions, {
                  label: '0x981C0774dFf527feBC014084b4d5300483812601',
                  value: '0x981C0774dFf527feBC014084b4d5300483812601',
                }]}
              >
                <Input />
              </AutoComplete>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={sendERC20Loading}>
                Send
              </Button>
              <Button style={{ marginLeft: 20 }} type="primary" loading={approveLoading} onClick={() => {
                const values = erc20Form.getFieldsValue();
                approveERC20(values);
              }}>
                Approve
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card bordered title="Send ERC721 Token" className={styles.card}>
          <Form
            name="erc721"
            form={erc721Form}
            onFinish={sendERC721Token}
            autoComplete="off"
            disabled={!wallet}
          >
            <Form.Item
              label="Receive address"
              name="address"
              rules={[{ required: true, message: 'Please input address!' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Contract address"
              name="contractAddress"
              initialValue={token.ERC721Address}
              rules={[{ required: true, message: 'Please input contract address!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Token ID/Token URI"
              name="tokenId"
              rules={[{ required: true, message: 'Please input Token ID / Token URI!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={sendERC721Loading}>
                  Send
                </Button>
                <Button type="primary" loading={mintERC721Loading} onClick={() => {
                  const values = erc721Form.getFieldsValue();
                  mintERC721Token(values);
                }}>
                  mintERC721
                </Button>
                <Button type="primary" onClick={() => {
                  const values = erc721Form.getFieldsValue();
                  getERC721OwnerOf(values);
                }}>ownerOf</Button>
              </Space>
            </Form.Item>
            {erc721Owner && <div>
              {`TokenID: ${erc721Form.getFieldsValue().tokenId} is owned by ${erc721Owner}`}
            </div>}
          </Form>
        </Card>
        <h3>Signature</h3>
        <Card bordered title="Personal Sign" className={styles.card}>
          <Form
            name="personalMsg"
            initialValues={{ message: 'Hello World' }}
            onFinish={signPersonalMessage}
            autoComplete="off"
            disabled={!wallet}
          >
            <Form.Item
              label="Message"
              name="message"
              rules={[{ required: true, message: 'Please input message!' }]}
            >
              <TextArea />
            </Form.Item>
            {
              signature && (
                <Form.Item
                  label="Signature"
                >
                  <TextArea value={signature} readOnly autoSize bordered={false} />
                </Form.Item>
              )
            }
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={signPersonalLoading}>
                Sign
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card bordered title="Sign Typed Data V4" className={styles.card}>
          <Form
            name="typedData"
            onFinish={signTypedData}
            autoComplete="off"
            disabled={!wallet}
          >
            <Form.Item
              name="message"
            >
              <JSONInput locale={locale} placeholder={typedData} width="100%" onChange={(content) => {
                console.log('content', content);
                setTypedData(content.jsObject);
              }} />
            </Form.Item>
            {
              typedSignature && (
                <Form.Item
                  label="Signature"
                >
                  <TextArea value={typedSignature} readOnly autoSize bordered={false} />
                </Form.Item>
              )
            }
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={signTypedLoading}>
                Sign
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card bordered title="Sign In With Ethereum" className={styles.card}>
          <Form onFinish={siweSign} disabled={!wallet}>
            {
              siweMessage && (
                <Form.Item label="message">
                  <TextArea value={siweMessage.prepareMessage()} readOnly autoSize bordered={false} />
                </Form.Item>
              )
            }
            {
              siweResult && (
                <Form.Item label="Signature">
                  <TextArea value={siweResult} readOnly autoSize bordered={false} />
                </Form.Item>
              )
            }
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={siweSignLoading}>Sign In With Ethereum</Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
      <Sider width={360} className={styles.sider} theme="light">
        <h2>Networks</h2>
        {
          account ? <p>{networksValue}</p> :
            <Select style={{ margin: '12px 0', width: 240 }}
              options={networkOptions}
              defaultValue={'testnet'}
              value={networksValue}
              onChange={(e: 'bsc' | 'testnet') => {
                setNetworksValue(e);
                // setERC20TokenList(erc20Token[e]);
              }}
            />
        }

        <h2>{wallet ? 'Wallet Information' : ''}</h2>
        {
          wallet && (
            <>
              <div className={styles.accountWrap}>
                <div className={styles.text}>{showOmitAccount(wallet?.accounts[0].address || "")}</div>
                <CopyToClipboard
                  text={account}
                  onCopy={(text: string, result: boolean) => {
                    if (result) message.success('Copied')
                  }}
                >
                  <CopyOutlined className={styles.icon} />
                </CopyToClipboard>
              </div>
              <p>Balance: {balance} {networksValue === 'bsc' ? 'BNB' : 'ETH'}</p>
            </>
          )
        }
        <Button type="primary" style={{ marginTop: 12, width: 240 }} onClick={
          () => wallet ? disconnect({ label: wallet.label }) : connect()}>{
            wallet ? 'Disconnect' : 'Connect'
          }</Button>
      </Sider>
    </Layout>
  );
};

export default Web3OnboardDemo;
