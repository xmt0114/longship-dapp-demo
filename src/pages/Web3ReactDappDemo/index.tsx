import React, {useEffect, useMemo, useState} from "react";
import { EIP1271 } from '@traitsniper/wallet-sdk';
import { Form, Input, AutoComplete, message, Modal, Select } from "antd";
import { ethers } from "ethers";
import { TransactionResponse } from '@ethersproject/providers';
import styles from './index.less';
import { Layout, Button } from 'antd';
import {searchERC1155TokenId, searchERC721TokenId, showOmitAccount} from "@/utils/utils";
import {CopyToClipboard} from "react-copy-to-clipboard";
import {CopyOutlined, DownloadOutlined} from "@ant-design/icons";
import Erc20Abi from "@/contract/abi/ERC20.json";
import Erc721Abi from "@/contract/abi/ERC721.json";
import Erc1155Abi from "@/contract/abi/ERC1155.json";
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import {eip712DemoData, EOA, token} from "@/config";
import { SiweMessage } from 'siwe';
import erc20Token from '@/erc20Token';
import { transferERC20 } from "@/utils/faucet";
import { useWeb3React } from "@web3-react/core";
import {LongShipConnector} from "@traitsniper/web3-react-v6-connector";
import MyErc721Abi from "@/contract/abi/myERC721.json";
import { InjectedConnector } from "@web3-react/injected-connector";

const { Sider, Content } = Layout;
const { TextArea } = Input;

const Dapp: React.FC = () => {
    const { active, library, activate, account, chainId, deactivate } = useWeb3React();

    const [signer, setSigner] = useState<any>(null);
    const [accountInfo, setAccountInfo] = useState<any>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [sign, setSign] = useState<string>('');
    const [typedData, setTypedData] = useState(eip712DemoData);
    const [typedDataSign, setTypedDataSign] = useState<string>('');
    const [networksValue, setNetworksValue] = useState<'bsc' | 'testnet'>((localStorage.getItem('currentNet') as 'testnet' | 'bsc') || window.origin.includes('traitsniper') ? 'bsc' : 'testnet');
    const [siweMessage, setSiweMessage] = useState<SiweMessage>();
    const [siweResult, setSiweResult] = useState<string>();
    const [balance, setBalance] = useState<string>('');
    const [connectBy, setConnectBy] = useState<string>('');
    const [USDMCBalance, setUSDMCBalance] = useState<string>('');
    const [networkOptions, setNetworkOptions] = useState<any[]>([]);
    const [erc20TokenList, setERC20TokenList] = useState(erc20Token[networksValue]);

    const chainIdMap = {
        testnet: 9527,
        bsc: 97
    }

    const erc20ContractOptions = useMemo(() => {
        return erc20Token[networksValue].map((token) => ({
            label: token.contract_address,
            value: token.contract_address
        }))
    }, [networksValue]);

    const connect = async () => {
        const longshipConnector = new LongShipConnector({
            appKey: '2462e054-4233-4ca1-bd79-be9512fc27b9', // 必填，用于区分不同dapp
            env: window.origin.includes('traitsniper') ? 'prod' : 'test', // 必填 test|prod
            chainType: networksValue, // 必填，env为test支持bsc、testnet, env为prod支持bsc
            connectType: 'twitter', // 选填， 用于连接时直接通过Twitter登陆
            // 选填，用于信息展示
            appSetting: {
                appName: 'traitsniper',
                appIcon: 'https://wallet-demo.blockservice.io/static/img/coins/128x128/ETH.png'
            }
        });
        try {
            await activate(longshipConnector, () => {
                localStorage.removeItem('currentConnect')
                localStorage.removeItem('currentNet')
            }, true);
            setConnectBy('web3React');
            localStorage.setItem('currentConnect', 'web3React')
            localStorage.setItem('currentNet', networksValue)
        } catch (e) {
            console.error(e);
        }
    };

    const connectByMetaMask = async () => {
        const injected = new InjectedConnector({
            supportedChainIds: [97, 9527],
            chainId: chainIdMap[networksValue]
        });
        try {
            await activate(injected, () => {
                localStorage.removeItem('currentConnect')
                localStorage.removeItem('currentNet')
            }, true);
            setConnectBy('metamask');
            localStorage.setItem('currentConnect', 'metamask')
            localStorage.setItem('currentNet', networksValue)
        } catch (e) {
            console.error(e);
        }
    }

    const disConnect = () => {
        deactivate();
        setSigner(null);
        setConnectBy('');
        localStorage.removeItem('currentConnect')
        localStorage.removeItem('currentNet')
    }

    const [ERC721Form] = Form.useForm();
    const [ERC1155Form] = Form.useForm();

    const personalMsgForm = Form.useForm()[0];
    const [erc20Form] = Form.useForm();
    const [ethForm] = Form.useForm();

    const getChains = async () => {
        const options = window.origin.includes('traitsniper') ? ['bsc'] : ['testnet', 'bsc']
        setNetworkOptions(options.map(t => ({
            label: t,
            value: t
        })))
    };

    useEffect(() => {
        getChains();
        const cache = localStorage.getItem('LSAC');
        const currentConnect = localStorage.getItem('currentConnect')
        if (currentConnect === 'web3React' && cache) {
            connect();
        } else if (currentConnect === 'metamask') {
            connectByMetaMask()
        }
    }, []);

    useEffect(() => {
        if (account) {
            setAccountInfo(JSON.parse(localStorage.getItem('LSAC')) || {});
        }
        if (library) {
            setSigner(library.getSigner(account!!));

        }
        if (account) {
            getEthBalance();
        }
        console.log('parseInt', chainId);
        if(library && chainId !== chainIdMap[networksValue]) {
            library.send('wallet_switchEthereumChain', [{ chainId: '0x' + (chainIdMap[networksValue]).toString(16) }]);
        }
    }, [account, library, chainId]);

    useEffect(() => {
        if (account && erc20TokenList.length) {
            updateERC20TokenBalance();
        }
    }, [JSON.stringify(erc20TokenList), account]);

    const getEthBalance = async () => {
        const res = await library.getBalance(account);
        setBalance(ethers.utils.formatEther(res) || '0');
        return ethers.utils.formatEther(res);
    };

    const getUSDMCBalance = async (contract_address:string) => {
        const erc20 = new ethers.Contract(contract_address, Erc20Abi, library);
        const balance = await erc20.balanceOf(account);
        const decimals = await erc20.decimals();
        setUSDMCBalance(balance / 10 ** decimals + '');
    };
    const getERC20Balance = async (token: string) => {
        const erc20 = new ethers.Contract(token, Erc20Abi, library);
        const balance = await erc20.balanceOf(account);
        const decimals = await erc20.decimals();
        return ethers.utils.formatUnits(balance, decimals);
    };
    const erc20Faucet = async (token: string) => {
        message.loading({content: 'sending', duration: 0});
        const tx = await transferERC20(token, account, 10, library);
        const receipt = await tx.wait();
        message.destroy();
        message.success('transfer success');
    };
    const updateERC20TokenBalance = async () => {
        let list = await Promise.all(erc20TokenList.map(async (token) => {
            let balance = await getERC20Balance(token.contract_address);
            return {
                ...token,
                balance,
            }
        }));
        console.log(list);
        setERC20TokenList(list);
    };

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
            const res = await signer.signMessage(e.message);
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
            const signature = await signer._signTypedData(
                typedData.domain,
                typedData.types,
                typedData.message
            );
            message.success('sign success');
            setTypedDataSign(signature);
        } catch(e) {
            message.error(e + '');
        } finally {
            setLoading(false);
        }
    }
    const siweSign = async () => {
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
        } catch(e) {
            message.error(e+'');
        }
    }

    const handleTransactionResponse = async (res: TransactionResponse, successCallback?: Function) => {
        console.log('tx res', res);
        const receipt = await res.wait();
        console.log('receipt', receipt);
        if (receipt.status === 1) {
            // message.success('transfer success');
            Modal.success({
                title: 'Success',
                content: <>
                    Transaction Hash: <br />
                    {receipt.transactionHash}
                </>
            })
            successCallback?.();
        } else {
            message.error('transfer fail');
        }
    };

    const sendETH = async (e:any) => {
        if (e.amount > balance) {
            //  return message.error('Insufficient Balance')
        };
        const txParams = {
            from: account,
            to: e.address,
            value: ethers.utils.parseEther(e.amount),
            data: "0x",
        };
        try {
            const txResp = await signer.sendTransaction(txParams);
            await handleTransactionResponse(txResp, getEthBalance);
        } catch (e) {
            console.log(e);
            getEthBalance();
        }
    }

    const sendERC20 = async (e:any) => {
        if (e.amount > USDMCBalance) {
            //  return message.error('Insufficient Balance')
        };
        const erc20 = new ethers.Contract(e.contractAddress, Erc20Abi, library);
        const decimals = await erc20.decimals();

        const callData = new ethers.utils.Interface(Erc20Abi).encodeFunctionData(
            'transfer',
            [e.address, ethers.utils.parseUnits(e.amount, decimals)]
        )
        try {
            const txResp = await signer.sendTransaction({
                from: account,
                to: e.contractAddress,
                value: '0x0',
                data: callData,
            });
            await handleTransactionResponse(txResp, updateERC20TokenBalance);
        } catch (e) {
            updateERC20TokenBalance();
            message.error(e + '');
        }
    };
    const sendERC721 = async (e:any) => {
        const callData = new ethers.utils.Interface(Erc721Abi).encodeFunctionData(
            'transferFrom',
            [account, e.address, e.tokenId]
        )
        try {
            const txResp = await signer.sendTransaction({
                from: account,
                to: e.contractAddress,
                value: '0x0',
                data: callData,
            });
            await handleTransactionResponse(txResp);
        } catch (e) {
            message.error(e + '');
        }
    };

    const sendERC1155 = async (e:any) => {
        const callData = new ethers.utils.Interface(Erc1155Abi).encodeFunctionData(
            'safeTransferFrom',
            [account, e.address, e.tokenId, e.amount, '0x']
        )
        try {
            const txResp = await signer.sendTransaction({
                from: account,
                to: e.contractAddress,
                value: '0x0',
                data: callData,
            });
            await handleTransactionResponse(txResp);
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
    const getAnyToken = async (to: string, amount: string, callBack?: (param?:any) => void, tokenName?: string) => {
        const messageKey = 'updatable';

        message.open({
            key: messageKey,
            type: 'loading',
            content: 'send ' + (tokenName || 'ETH'),
            duration: 300,
        });


        const wallet = new ethers.Wallet(EOA.privateKey, library);
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

    const approveERC20 = async (e:any) => {
        const erc20 = new ethers.Contract(e.contractAddress, Erc20Abi, signer);
        const balance = await erc20.balanceOf(account);
        const spenderAddress = e.spender || '0x981C0774dFf527feBC014084b4d5300483812601'; // Address of the spender

        try {
            const tx = await erc20.approve(spenderAddress, balance);
            // tx && tx.wait && await tx.wait();
            await handleTransactionResponse(tx);
        } catch (e) {
            message.error(e + '');
        }
    };

    const mintERC721 = async (e) => {
        if (!e.address || !e.tokenId || !e.contractAddress) {
            return message.error('please enter all');
        }
        const erc721 = new ethers.Contract(e.contractAddress, MyErc721Abi, signer);

        try {
            const tx = await erc721.mint(e.address, e.tokenId);
            // tx && tx.wait && await tx.wait();
            await handleTransactionResponse(tx);
        } catch (e) {
            message.error(e + '');
        }
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
                        <h4>Send { networksValue === 'bsc' ? 'BNB' : 'ETH'}</h4>
                        <Form
                            name="eth"
                            initialValues={{ remember: true }}
                            onFinish={e => onSubmit(e, sendETH)}
                            autoComplete="off"
                            form={ethForm}
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
                            </Form.Item>
                        </Form>
                    </div>
                    <div className={styles.borderBox}>
                        <h4>Send ERC20 Token</h4>
                        <Form
                            name="erc20"
                            initialValues={{
                                spender: '0x981C0774dFf527feBC014084b4d5300483812601',
                                contractAddress: erc20ContractOptions[0].value
                            }}
                            onFinish={e => onSubmit(e, sendERC20)}
                            autoComplete="off"
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
                                <Button type="primary" htmlType="submit">
                                    Send
                                </Button>

                                <Button style={{marginLeft: 20}} type="primary" onClick={() => {
                                    const values = erc20Form.getFieldsValue();

                                    onSubmit(values, approveERC20);
                                }}>
                                    Allow paymaster to spend ERC20
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
                                <Button style={{marginLeft: 20}} type="primary" onClick={() => {
                                    const values = ERC721Form.getFieldsValue();

                                    onSubmit(values, mintERC721);
                                }}>
                                    mintERC721
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
                                            const res = await signer.isValidSignature(msg, sign);
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
                                            const res = await signer.isValidTypedSignature(typedData, typedDataSign);
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
                                                const res = await signer.isValidSignature(siweMessage.prepareMessage(), siweResult);
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
                                                    accountInfo.owner,
                                                    siweResult
                                                );
                                                try {
                                                    const result = await siweMessage.validate(packedSignature, library);
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
                    <h2>Networks</h2>
                    {
                        account ? <p>{networksValue}</p> :
                            <Select style={{margin: '12px 0', width: 240}}
                                    options={networkOptions}
                                    defaultValue={'testnet'}
                                    value={networksValue}
                                    onChange={(e: 'bsc' | 'testnet') => {
                                        setNetworksValue(e);
                                        setERC20TokenList(erc20Token[e]);
                                    }}
                            />
                    }
                    <h2>{account ? 'Wallet Information' : 'Login Methods'}</h2>
                    {
                        account && (
                            <>
                                <div className={styles.accountWrap}>
                                    <p>{showOmitAccount(account)}</p>
                                    <CopyToClipboard
                                        text={account}
                                        onCopy={(text: string, result: boolean) => {
                                            if (result) message.success('复制成功')
                                        }}
                                    >
                                        <CopyOutlined className={styles.icon} />
                                    </CopyToClipboard>
                                </div>
                                <p>Balance: {balance} { networksValue === 'bsc' ? 'BNB' : 'ETH'}</p>
                                {/* <p>USDMC Balance: {USDMCBalance} USDMC</p> */}
                                {erc20TokenList.map((token) => (
                                    <p key={token.contract_address}>{token.name} Balance: {token.balance || '0'} {token.symbol}</p>
                                ))}
                                {accountInfo.signature && <div className={styles.signWrap}>
                                  <div className={styles.title}>Sign With Ethereum message</div>
                                  <TextArea value={accountInfo.message} readOnly />
                                  <div className={styles.title}>Sign With Ethereum Signature</div>
                                  <TextArea value={accountInfo.signature} readOnly />
                                </div>}
                            </>
                        )
                    }

                    {
                        connectBy !== 'metamask' && (
                            <Button type="primary" style={{marginTop: 12, width: 240}} onClick={
                                () => account ? disConnect() : connect()}>{
                                account ? 'Disconnect' : 'Connect by web3-react'
                            }</Button>
                        )
                    }
                    {
                        connectBy !== 'web3React' && (
                            <Button type="primary" style={{marginTop: 12, width: 240}} onClick={
                                () => account ? disConnect() : connectByMetaMask()}>{
                                account ? 'Disconnect' : 'Connect by Metamask'
                            }</Button>
                        )
                    }
                    {
                        networksValue === 'testnet' && account && (
                            <>
                                <Button
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await getAnyToken(account, '10', getEthBalance);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    icon={<DownloadOutlined />}
                                    style={{marginTop: 12, width: 240}}
                                >ETH Token</Button>
                                {/*<Button*/}
                                {/*    onClick={async () => {*/}
                                {/*        setLoading(true);*/}
                                {/*        try {*/}
                                {/*            await getAnyToken(account, '1', inputERC721, 'ERC721')*/}
                                {/*        } finally {*/}
                                {/*            setLoading(false);*/}
                                {/*        }*/}
                                {/*    }}*/}
                                {/*    icon={<DownloadOutlined />}*/}
                                {/*    style={{marginTop: 12, width: 240}}*/}
                                {/*>ERC721 Token</Button>*/}
                                {/*<Button*/}
                                {/*    onClick={async () => {*/}
                                {/*        setLoading(true);*/}
                                {/*        try {*/}
                                {/*            await getAnyToken(account, '1', inputERC1155, 'ERC1155')*/}
                                {/*        } finally {*/}
                                {/*            setLoading(false);*/}
                                {/*        }*/}
                                {/*    }}*/}
                                {/*    icon={<DownloadOutlined />}*/}
                                {/*    style={{marginTop: 12, width: 240}}*/}
                                {/*>ERC1155 Token</Button>*/}
                            </>
                        )
                    }
                    {
                        account && erc20TokenList.map((token) => (
                            <Button key={token.contract_address}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await erc20Faucet(token.contract_address);
                                            updateERC20TokenBalance();
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    icon={<DownloadOutlined />}
                                    style={{marginTop: 12, width: 240}}
                            >{token.name}</Button>
                        ))
                    }
                </Sider>
            </Layout>
        </div>
    )
}
export default Dapp;
