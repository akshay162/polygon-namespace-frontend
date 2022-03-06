import React, {useEffect, useState} from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { Contract, ethers, providers } from 'ethers';
import contractAbi from './utils/contractABI.json'
import ethLogo from './assets/ethlogo.png';
import polygonLogo from './assets/polygonlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = '.af';
const CONTRACT_ADDRESS = '0xeCa77936cb3E216D2de0a211cDE605834b03eFE2';

const App = () => {

	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');

	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);

	const connectWallet = async () => {
		try {
			const {ethereum} = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}
			const accounts = await ethereum.request({method: 'eth_requestAccounts'});

			console.log("Connected to : ", accounts[0]);
			setCurrentAccount(accounts[0]);

		} catch(error) {
			console.log("error is ", error);
		}
	}

	const checkIfWalletIsConnected = async () => {
		const {ethereum} = window;

		if (!ethereum) {
			console.log("Please get metamask");
			return;
		} else {
			console.log("We have ethereum object ", ethereum);
		}

		const accounts = await ethereum.request({method: 'eth_accounts'});

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log("Found and authorised account ", account);
			setCurrentAccount(account);
		} else {
			console.log("No authorised account found");
		}

		const chainId = await ethereum.request({method: 'eth_chainId'});
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);

		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	}

	const mintDomain = async() => {

		if (!domain) {
			return;
		}
		if (domain.length < 3) {
			alert("Domain should be atleast 3 chars long");
			return;
		}

		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);

		try {
			const {ethereum} = window;

			if (ethereum) {
				// node provided by metmask in background to send/recieve data to our contract
				const provider = new ethers.providers.Web3Provider(ethereum); 
				// signer is abstract class use to sign messages and txns and send signed txns to ethereum network.
				const signer = provider.getSigner(); 

				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				console.log("Going to pop wallet now to pay gas...")
				let txn = await contract.register(domain, {value: ethers.utils.parseEther(price)})
				const receipt = await txn.wait();

				if (receipt.status == 1) {
					console.log("Domain minted : https://mumbai.polygonscan.com/tx/" + txn.hash);

					if (record.length > 0) {
						txn = await contract.setRecord(domain, record);
						await txn.wait();

						console.log("Record set! https://mumbai.polygonscan.com/tx/" + txn.hash)
					}
					
					setTimeout(() => {
						fetchMints()
					}, 2000);

					setDomain('');
					setRecord('');

				} else {
					alert('Transaction Failed, Try again!');
				}
			}

		} catch(err) {
			console.log("Errror is : ", err);
		}

	}

	const updateDomain = async() => {

		if (!domain || !record) return;

		setLoading(true);
		console.log("updating domain ", domain, " with record ", record);

		try {

			const {ethereum} = window;

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();

				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let txn = await contract.setRecord(domain, record);
				txn.wait();

				console.log("Record set https://mumbai.polygonscan.com/tx/" + txn.hash);
				
				fetchMints();
				setDomain('');
				setRecord('');
			}

		} catch(err) {
			console.log(err)
		}

		setLoading(false);

	}

	const fetchMints = async() => {
		try {
			const {ethereum} = window;

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let names = await contract.getAllNames();
				// names.wait();

				console.log("names are ", names);
				
				const mintRecords = await Promise.all(names.map(async(name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					}
				}));

				console.log("MINTS FETCHED ", mintRecords);
				setMints(mintRecords);
			}
		} catch(err) {
			console.log(err);
		}
	}

	// Add this render function next to your other render functions
	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle"> Recently minted domains!</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										{/* If mint.owner is currentAccount, add an "edit" button*/}
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
						<p> {mint.record} </p>
					</div>)
					})}
				</div>
			</div>);
		}
	};

	// This will take us into edit mode and show us the edit buttons!
	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}

	const switchNetworkToMumbaiPolygon = async() => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId : '0x13881' }]
				})
			} catch(err) {
				// polygon chain is not added to metamask
				if (err.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName : 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								}
							]
						})
					} catch(err) {
						console.log(err);
					}
				}

				console.log(err);
			}
		} else {
			alert("Metamask Not installed, Pls install metamask : https://metamask.io/download.html");
		}
	}

	const renderInputForm = () =>{

		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<p>Please connect to the Polygon Mumbai Testnet</p>

					<button className='cta-button mint-button' onClick={switchNetworkToMumbaiPolygon}>Click here to switch</button>
				</div>
			)

		}

		return (
			<div className="form-container">
				<img src="https://media1.giphy.com/media/xT9IgMw9fhuEGUaJqg/giphy.gif" alt="AF gif" />
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='whats ur fucking meme power'
					onChange={e => setRecord(e.target.value)}
				/>

				{editing ? (
					<div className="button-container">
						// This will call the updateDomain function we just made
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set record
						</button>  
						// This will let us get out of editing mode by setting editing to false
						<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
							Cancel
						</button>  
					</div>
				): (
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>  
				)}

			</div>
		);
	}


	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media1.giphy.com/media/xT9IgMw9fhuEGUaJqg/giphy.gif" alt="AF gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
  	);

	useEffect(() => {
		checkIfWalletIsConnected();
	}, [])

	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network ])

  return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">🐱‍👤 AF Naming Service</p>
							<p className="subtitle">Your immortal API on the blockchain!</p>
						</div>

						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>

					{!currentAccount && renderNotConnectedContainer()}
					{currentAccount && renderInputForm()}
					{mints && renderMints()}
				</div>
				
        		<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built with @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
