import React, {useEffect, useState} from "react";
import { LongshipSDK, EIP1271 } from 'able-wallet-core';
import { Form, Input, message, Select, Modal } from "antd";
import { ethers } from "ethers";
import styles from './index.less';
import { Layout, Button } from 'antd';
import {showOmitAccount} from "@/utils/utils";
import {CopyToClipboard} from "react-copy-to-clipboard";
import {CopyOutlined, DownloadOutlined} from "@ant-design/icons";
import Erc20Abi from "@/contract/abi/ERC20.json";
import Erc721Abi from "@/contract/abi/ERC721.json";
import Erc1155Abi from "@/contract/abi/ERC1155.json";
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import { eip712DemoData, CHAIN_CONFIGS, paymaster, token, EOA } from "../config";
import { SiweMessage } from 'siwe';
import { getServerSignature, getPaymasterAndData } from "../server";
import { searchERC721TokenId, searchERC1155TokenId } from "@/utils/utils";

const { Sider, Content } = Layout;
const { TextArea } = Input;

 const Dapp: React.FC = () => {
     const longshipWallet = new LongshipSDK();
     const [account, setAccount] = useState<any>(undefined);
     const [loading, setLoading] = useState<boolean>(false);
     const [sign, setSign] = useState<string>('');
     const [typedData, setTypedData] = useState(eip712DemoData);
     const [typedDataSign, setTypedDataSign] = useState<string>('');
     const [siweMessage, setSiweMessage] = useState<SiweMessage>();
     const [siweResult, setSiweResult] = useState<string>();
     const [coinName, setCoinName] = useState<string>('');
     const [balance, setBalance] = useState<string>('');
     const [USDMCBalance, setUSDMCBalance] = useState<string>('');

     const ethersProvider = longshipWallet.getProvider();

     const [ERC721Form] = Form.useForm();
     const [ERC1155Form] = Form.useForm();

     const personalMsgForm = Form.useForm()[0];
     const [form] = Form.useForm();

     const networkOptions = [{
         label: 'intranet testnet',
         value: 'intranet',
     },{
         label: 'testnet',
         value: 'out',
     }];

     useEffect(() => {
        const account = longshipWallet.getAccount();
         if (account) {
             setAccount(account);
        }
     }, []);

     useEffect(() => {
         if (account) {
             getEthBalance();
             getUSDMCBalance();
             // getERC721Balance(account.wallet_address);
             // getERC1155Balance(account.wallet_address);
         }
     }, [account])

     const getAnyToken = async (to: string, amount: string, callBack?: (param?:any) => void, tokenName?: string) => {
        const messageKey = 'updatable';

        message.open({
            key: messageKey,
            type: 'loading',
            content: 'send ' + (tokenName || 'ETH'),
            duration: 300,
        });

        const wallet = new ethers.Wallet(EOA.privateKey, ethersProvider);
        let tokenId:any;
        let tx:any;
        if (tokenName === 'ERC20') {
            const erc20 = new ethers.Contract(token.USDMCToken.address, Erc20Abi, wallet);
            const erc20Amount = ethers.utils.parseUnits(amount, token.USDMCToken.decimal);
            tx = await erc20.transfer(to, erc20Amount);
        } else if (tokenName === 'ERC721') {
            const erc721 = new ethers.Contract(token.ERC721Address, Erc721Abi, wallet);
            tokenId = await searchERC721TokenId();
            if (!tokenId) return message.error('master account balance not enough')
            tx = await erc721.transferFrom(EOA.address, to, tokenId);
        } else if (tokenName === 'ERC1155') {
            const erc1155 = new ethers.Contract(token.ERC1155Address, Erc1155Abi, wallet);
            tokenId = await searchERC1155TokenId();
            if (!tokenId) return message.error('master account balance not enough')
            tx = await erc1155.safeTransferFrom(EOA.address, to, tokenId, 1, '0x');
        } else {
            tx = await wallet.sendTransaction({
                to: to,
                value:ethers.utils.parseEther(amount)
            });
        }

        const receipt = await tx.wait();
            message.open({
                key: messageKey,
                type: 'success',
                content: `send success${tokenId ? ' and value has been automatically input' : ''}`,
                duration: 2,
            });
        console.log(receipt);
        callBack && callBack(tokenId);
    };

     const getEthBalance = async () => {
         const walletAddress = account.wallet_address;
         const res = await ethersProvider.getBalance(walletAddress);
         setBalance(ethers.utils.formatEther(res) || '0');
         return ethers.utils.formatEther(res);
     };

     const getUSDMCBalance = async () => {
         const walletAddress = account.wallet_address;
         const erc20 = new ethers.Contract(token.USDMCToken.address, Erc20Abi, ethersProvider);
         const balance = await erc20.balanceOf(walletAddress);
         const decimals = await erc20.decimals();
         setUSDMCBalance(balance / 10 ** decimals + '');
     };
     const getERC721Balance = async (walletAddress: string) => {
         const erc721 = new ethers.Contract(token.ERC721Address, Erc721Abi, ethersProvider);
         const numbers = Number((await erc721.balanceOf(walletAddress)).toString());
         const tokenIds = [];
         console.log(await erc721.tokenOfOwnerByIndex(walletAddress, 1));
         // for (let i = 0; i < numbers; i++) {
         //     const id = await erc721.tokenOfOwnerByIndex(walletAddress, i+'');
         //     tokenIds.push(id);
         // };
     };

     const getERC1155Balance = async (walletAddress:string) => {
         const erc1155 = new ethers.Contract(token.ERC1155Address, Erc1155Abi, ethersProvider);
         const res = await erc1155.balanceOf(walletAddress, '1');
         console.log(res.toNumber());
     }

     const onSubmit = async (e:any, functionName:(params:any) => void) => {
         if (!account) {
             return message.warning('please connect able wallet')
         };
         setLoading(true);
         try {
             await functionName(e);
         } finally {
             setLoading(false);
         }
     };

     const signPersonalMessage = async (e:any) => {
         setLoading(true);
         try {
             const res = await longshipWallet.signMessage(e.message);
             message.success('sign success');
             setSign(res);
         } catch (e) {
             message.error(e+'')
         } finally {
             setLoading(false);
         }
     }

     const signTypedData = async () => {
        try {
            const res = await longshipWallet.signTypedData(typedData);
            message.success('sign success');
            setTypedDataSign(res);
        } catch(e) {
            message.error(e + '');
        } finally {
            setLoading(false);
        }
     }
     const siweSign = async () => {
        const siweMessage: SiweMessage = new SiweMessage({
            domain: window.location.host,
            address: account.wallet_address,
            statement: 'Sign in with Ethereum to the app.',
            uri: window.location.origin,
            version: '1',
            chainId: 1
        });
        setSiweMessage(siweMessage);
        const msg = siweMessage.prepareMessage();
        try {
            const res = await longshipWallet.siweSign(msg);
            setSiweResult(res);
        } catch(e) {
            message.error(e+'');
        }
     }

     const sendETH = async (e:any) => {
         if (e.amount > balance) {
             return message.error('Insufficient Balance')
         };
         try {
             const res = await longshipWallet.sendTransaction({
                 from: account.wallet_address,
                 to: e.address,
                 value: e.amount,
                 data: '0x',
                 info: {
                     type: 'ETH',
                     to: e.address,
                     amount: e.amount,
                     name: 'eth'
                 },
                 paymasterOptions: e.paymasterOptions,
             })
             if (res === 'transfer success') {
                 message.success(res);
                 getEthBalance();
             } else {
                 message.error(res)
             }
         } catch (e) {
             message.error(e + '');
         }
     }

     const sendERC20 = async (e:any) => {
         if (e.amount > USDMCBalance) {
             return message.error('Insufficient Balance')
         };
         const erc20 = new ethers.Contract(e.contractAddress, Erc20Abi, ethersProvider);
         const decimals = await erc20.decimals();
         const callData = new ethers.utils.Interface(Erc20Abi).encodeFunctionData(
             'transfer',
             [e.address, ethers.utils.parseUnits(e.amount, decimals)]
         )
         try {
             const res = await longshipWallet.sendTransaction({
                 from: account.wallet_address,
                 to: e.contractAddress,
                 value: '0x0',
                 data: callData,
                 info: {
                     type: 'ERC20',
                     to: e.address,
                     amount: e.amount,
                     name: 'usdmc'
                 }
             });
             if (res === 'transfer success') {
                 message.success(res);
                 getUSDMCBalance();
             } else {
                 message.error(res)
             }
         } catch (e) {
             message.error(e + '');
         }
     };
     const sendERC721 = async (e:any) => {
         const callData = new ethers.utils.Interface(Erc721Abi).encodeFunctionData(
             'transferFrom',
             [account.wallet_address, e.address, e.tokenId]
         )
         try {
             const res = await longshipWallet.sendTransaction({
                 from: account.wallet_address,
                 to: e.contractAddress,
                 value: '0x0',
                 data: callData,
                 info: {
                     type: 'ERC721',
                     to: e.address,
                     tokenId: e.tokenId,
                     name: 'erc721'
                 }
             });
             if (res === 'transfer success') {
                 message.success(res);
             } else {
                 message.error(res)
             }
         } catch (e) {
             message.error(e + '');
         }
     };

     const sendERC1155 = async (e:any) => {
         const callData = new ethers.utils.Interface(Erc1155Abi).encodeFunctionData(
             'safeTransferFrom',
             [account.wallet_address, e.address, e.tokenId, e.amount, '0x']
         )
         try {
             const res = await longshipWallet.sendTransaction({
                 from: account.wallet_address,
                 to: e.contractAddress,
                 value: '0x0',
                 data: callData,
                 info: {
                     type: 'ERC1155',
                     to: e.address,
                     amount: e.amount,
                     tokenId: e.tokenId,
                     name: 'erc1155'
                 }
             });
             if (res === 'transfer success') {
                 message.success(res);
             } else {
                 message.error(res)
             }
         } catch (e) {
             message.error(e + '');
         }
     };

     const inputERC721 = (tokenId?:number) => {
         ERC721Form.setFieldsValue({
             tokenId,
         })
     };
     const inputERC1155 = (tokenId?:number) => {
         ERC1155Form.setFieldsValue({
             tokenId,
             amount: 1
         })
     };

     const updateConfig = (e:'intranet'|'out') => {
         longshipWallet.updateConfig({
             chainType: e,
             nodeRPC: CHAIN_CONFIGS[e].rpc,
         });
         console.log(longshipWallet._config);
     }

     return (
         <div className={styles.container}>
             {
                 loading && <div className={styles.mask}/>
             }
             <Layout>
                 <Content className={styles.contentLeft}>
                     <h2>Able Network</h2>
                     <h3>Transaction</h3>
                     <div className={styles.borderBox}>
                         <h4>Send ETH</h4>
                         <Form
                             name="eth"
                             initialValues={{ remember: true }}
                             onFinish={e => onSubmit(e, sendETH)}
                             autoComplete="off"
                             form={form}
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
                                 <Button type="primary" htmlType="submit">
                                     Send
                                 </Button>
                                 <Button style={{marginLeft: 20}} type="primary" onClick={() => {
                                    const values = form.getFieldsValue();

                                    const params = {
                                        ...values,
                                        paymasterOptions: {
                                            // address: paymaster.address,
                                            // validUntil: paymaster.validUntil,
                                            // validAfter: paymaster.validAfter,
                                            callback: 'confirmSign',
                                        }
                                    }
                                    const confirmSign = (op) => {
                                        return new Promise((resolve, reject) => {
                                            return Modal.confirm({
                                                title: '确认签名？',
                                                onCancel: () => {
                                                    reject('user cancel');
                                                },
                                                onOk: async () => {
                                                    const sig = await getServerSignature(op);
                                                    const paymasterAndData = getPaymasterAndData(
                                                        paymaster.address,
                                                        paymaster.validUntil,
                                                        paymaster.validAfter,
                                                        sig,
                                                    );
                                                    resolve(paymasterAndData);
                                                },
                                            })
                                        })
                                    }
                                    window.confirmSign = confirmSign;
                                    onSubmit(params, sendETH);
                                 }}>
                                     Send With Paymaster
                                 </Button>
                             </Form.Item>
                         </Form>
                     </div>
                     <div className={styles.borderBox}>
                         <h4>Send ERC20 Token</h4>
                         <Form
                             name="erc20"
                             initialValues={{ remember: true }}
                             onFinish={e => onSubmit(e, sendERC20)}
                             autoComplete="off"
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
                                 initialValue={token.USDMCToken.address}
                                 rules={[{ required: true, message: 'Please input contract address!' }]}
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
                                 <Button type="primary" htmlType="submit">
                                     Send
                                 </Button>
                             </Form.Item>
                         </Form>
                     </div>
                     <div className={styles.borderBox}>
                         <h4>Send ERC721 Token</h4>
                         <Form
                             name="erc721"
                             form={ERC721Form}
                             initialValues={{ remember: true }}
                             onFinish={e => onSubmit(e, sendERC721)}
                             autoComplete="off"
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
                                 label="Token ID"
                                 name="tokenId"
                                 rules={[{ required: true, message: 'Please input token amount!' }]}
                             >
                                 <Input />
                             </Form.Item>

                             <Form.Item>
                                 <Button type="primary" htmlType="submit">
                                     Send
                                 </Button>
                             </Form.Item>
                         </Form>
                     </div>
                     <div className={styles.borderBox}>
                         <h4>Send ERC1155 Token</h4>
                         <Form
                             name="erc1155"
                             form={ERC1155Form}
                             initialValues={{ remember: true }}
                             onFinish={e => onSubmit(e, sendERC1155)}
                             autoComplete="off"
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
                                 initialValue={token.ERC1155Address}
                                 rules={[{ required: true, message: 'Please input contract address!' }]}
                             >
                                 <Input />
                             </Form.Item>

                             <Form.Item
                                 label="Token ID"
                                 name="tokenId"
                                 rules={[{ required: true, message: 'Please input token amount!' }]}
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
                                 <Button type="primary" htmlType="submit">
                                     Send
                                 </Button>
                             </Form.Item>
                         </Form>
                     </div>
                     <h3>Signature</h3>
                     <div className={styles.borderBox}>
                         <h4>Personal Sign</h4>
                         <Form
                             name="personalMsg"
                             initialValues={{ message: 'Hello World' }}
                             onFinish={e => onSubmit(e, signPersonalMessage)}
                             autoComplete="off"
                             form={personalMsgForm}
                         >
                             <Form.Item
                                 label="Message"
                                 name="message"
                                 rules={[{ required: true, message: 'Please input message!' }]}
                             >
                                 <TextArea/>
                             </Form.Item>

                             {
                                 sign && (
                                     <Form.Item
                                         label="Signature"
                                     >
                                         <TextArea value={sign} readOnly autoSize bordered={false}/>
                                     </Form.Item>
                                 )
                             }

                             <Form.Item>
                                 <Button type="primary" htmlType="submit">
                                     Sign
                                 </Button>
                                 {
                                     sign && (
                                         <Button style={{marginLeft: 24}} type="primary" onClick={async () => {
                                            const msg = personalMsgForm.getFieldValue('message');
                                            const res = await longshipWallet.isValidSignature(msg, sign);
                                            if (res) {
                                                message.success('verify signature success');
                                            } else {
                                                message.error('verify signature failed');
                                            }
                                         }}>
                                             Verify
                                         </Button>
                                     )
                                 }
                             </Form.Item>
                         </Form>
                     </div>
                     <div className={styles.borderBox}>
                         <h4>Sign Typed Data V4</h4>
                         <Form
                             name="typedData"
                             onFinish={e => onSubmit(e, signTypedData)}
                             autoComplete="off"
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
                                 typedDataSign && (
                                     <Form.Item
                                         label="Signature"
                                     >
                                         <TextArea value={typedDataSign} readOnly autoSize bordered={false}/>
                                     </Form.Item>
                                 )
                             }

                             <Form.Item>
                                 <Button type="primary" htmlType="submit" loading={loading}>
                                     Sign
                                 </Button>
                                 {
                                     typedDataSign && (
                                         <Button style={{marginLeft: 24}} type="primary" onClick={async () => {
                                            const res = await longshipWallet.isValidTypedSignature(typedData, typedDataSign);
                                            if (res) {
                                                message.success('verify signature success');
                                            } else {
                                                message.error('verify signature failed');
                                            }
                                         }}>
                                             Verify
                                         </Button>
                                     )
                                 }
                             </Form.Item>
                         </Form>
                     </div>
                     <div className={styles.borderBox}>
                        <h4>Sign In With Ethereum</h4>
                        <Form onFinish={e => onSubmit(e, siweSign)}>
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
                                         <TextArea value={siweResult} readOnly autoSize bordered={false}/>
                                     </Form.Item>
                                 )
                             }
                            <Form.Item>
                                <Button type="primary" htmlType="submit">Sign In With Ethereum</Button>
                                {
                                     siweResult && (
                                        <>
                                            <Button style={{marginLeft: 24}} type="primary" onClick={async () => {
                                                if (!siweMessage) return;
                                                const res = await longshipWallet.isValidSignature(siweMessage.prepareMessage(), siweResult);
                                                if (res) {
                                                    message.success('verify signature success');
                                                } else {
                                                    message.error('verify signature failed');
                                                }
                                            }}>
                                                Verify
                                            </Button>
                                            <Button type="primary" style={{marginLeft: 24}} onClick={async () => {
                                                if (!siweMessage) return;
                                                const packedSignature = EIP1271.encodeSignature(
                                                    account.owner,
                                                    siweResult
                                                );
                                                const provider = await longshipWallet.getAuthProvider();
                                                try {
                                                    const result = await siweMessage.validate(packedSignature, provider);
                                                    console.log('verify result', result);
                                                    message.success('verify signature success');
                                                } catch(e) {
                                                    console.error(e);
                                                    message.error(e + '');
                                                }
                                            }}>Verify with siwe</Button>
                                         </>
                                     )
                                 }
                            </Form.Item>
                        </Form>
                     </div>
                 </Content>
                 <Sider width={360} className={styles.contentRight} theme="light">
                     {
                         !account && (
                             <>
                                 <h2>Networks</h2>
                                 <Select style={{margin: '12px 0', width: 240}}
                                         defaultValue={'intranet'}
                                         options={networkOptions}
                                         onChange={e => updateConfig(e)}
                                 />
                             </>
                         )
                     }
                     <h2>{account ? 'Wallet Information' : 'Login Methods'}</h2>
                     {
                         account && (
                             <>
                                 <div className={styles.accountWrap}>
                                     <p>{showOmitAccount(account.wallet_address)}</p>
                                     <CopyToClipboard
                                         text={account.wallet_address}
                                         onCopy={(text: string, result: boolean) => {
                                             if (result) message.success('复制成功')
                                         }}
                                     >
                                         <CopyOutlined className={styles.icon} />
                                     </CopyToClipboard>
                                 </div>
                                 <p>Balance: {balance} ETH</p>
                                 <p>USDMC Balance: {USDMCBalance} USDMC</p>
                                 {account.signature && <div className={styles.signWrap}>
                                    <div className={styles.title}>Sign With Ethereum message</div>
                                    <TextArea value={account.message} readOnly />
                                    <div className={styles.title}>Sign With Ethereum Signature</div>
                                    <TextArea value={account.signature} readOnly />
                                 </div>}
                             </>
                         )
                     }

                     <Button type="primary" style={{marginTop: 12, width: 240}} onClick={async () => {
                         if (account) {
                             setAccount(undefined);
                             localStorage.removeItem('LSAC');
                         } else {
                             try {
                                 const res = await longshipWallet.login({
                                     eventListener: (event: any) => {
                                         console.log("event", event);
                                         message.info(
                                             'eventListener'
                                         )
                                     },
                                 })
                                 setAccount(res);
                             } catch (e) {
                                 message.error(e+'')
                             }
                         }
                     }}>{
                         account ? 'Disconnect' : 'Connect'
                     }</Button>
                     {!account && <Button style={{marginTop: 12, width: 240}} type="primary" onClick={async () => {
                        try {
                            const res = await longshipWallet.login({
                                authorize: true,
                            })
                            setAccount(res);
                        } catch (e) {
                            message.error(e+'')
                        }
                     }}>
                        Connect and Auth
                        </Button>
                     }
                     <Button
                         onClick={async () => {
                             setLoading(true);
                             try {
                                 await getAnyToken(account.wallet_address, '1', getEthBalance);
                             } finally {
                                 setLoading(false);
                             }
                         }}
                         icon={<DownloadOutlined />}
                         style={{marginTop: 12, width: 240}}
                     >ETH Token</Button>
                     <Button
                         onClick={async () => {
                             setLoading(true);
                             try {
                                 await getAnyToken(account.wallet_address, '1', getUSDMCBalance, 'ERC20')
                             } finally {
                                 setLoading(false);
                             }
                         }}
                         icon={<DownloadOutlined />}
                         style={{marginTop: 12, width: 240}}
                     >ERC20 Token</Button>
                     <Button
                         onClick={async () => {
                             setLoading(true);
                             try {
                                 await getAnyToken(account.wallet_address, '1', inputERC721, 'ERC721')
                             } finally {
                                 setLoading(false);
                             }
                         }}
                         icon={<DownloadOutlined />}
                         style={{marginTop: 12, width: 240}}
                     >ERC721 Token</Button>
                     <Button
                         onClick={async () => {
                             setLoading(true);
                             try {
                                 await getAnyToken(account.wallet_address, '1', inputERC1155, 'ERC1155')
                             } finally {
                                 setLoading(false);
                             }
                         }}
                         icon={<DownloadOutlined />}
                         style={{marginTop: 12, width: 240}}
                     >ERC1155 Token</Button>
                 </Sider>
             </Layout>
         </div>
    )
}
export default Dapp;
