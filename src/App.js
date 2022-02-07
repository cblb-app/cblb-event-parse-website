import { useState } from "react";
import Web3 from "web3";
import { abi } from "./abi";
import "./App.css";
import { useInterval } from "./useInterval";
import { CSVLink } from "react-csv";

function App() {
  // parameter config
  const csvFilename = "event-list.csv"; // event list file name
  const contractAddress = "0x580a84c73811e1839f75d86d75d88cca0c241ff4"; //  contract address
  const eventName = "Approval"; // event name
  const startBlocknumber = 23950682;
  const finalBlocknumber = 24621682;
  // @2022/2 recommand use official rpc: https://polygon-rpc.com/
  // @2022/2 ref doc: https://docs.polygon.technology/docs/develop/network-details/network/
  const parseStep = 10000; // 10000 event per parse action, related to your rpc

  const intervalDuration = 5000; // milisecond
  // config END

  const [provider, setProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [currBlocknumber, setCurrBlocknumber] = useState(startBlocknumber);
  const [eventList, setEvnList] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingNumber, setParingNumber] = useState(0);
  const polygonscanAddressPrefix = "https://polygonscan.com/address/";
  const polygonscanTxPrefix = "https://polygonscan.com/tx/";

  const handleWalletConnect = () => {
    if (window.ethereum) {
      setProvider(window.ethereum);
      let web3 = new Web3(window.ethereum);
      web3.eth.getAccounts((error, accounts) => {
        if (error) {
          console.log(error);
        } else {
          console.log(accounts);
          if (accounts.length === 0) {
            window.ethereum.request({ method: "eth_requestAccounts" });
          } else {
            setWalletAddress(accounts[0]);
          }
        }
      });
    } else {
      alert("no metamask");
    }
  };

  function handleParseEvent() {
    setIsParsing(true);
  }

  function parseEvent(startBlock) {
    let web3 = new Web3(provider);
    const contractInstance = new web3.eth.Contract(abi, contractAddress);

    contractInstance
      .getPastEvents(
        eventName,
        {
          fromBlock: startBlock,
          toBlock:
            finalBlocknumber < startBlock + parseStep
              ? finalBlocknumber
              : startBlock + parseStep,
        },
        (error, events) => {
          if (error) {
            console.log("error", error);
          } else {
            //console.log(events);
          }
        }
      )
      .then((events) => {
        setCurrBlocknumber(() => {
          return currBlocknumber + parseStep > finalBlocknumber
            ? finalBlocknumber
            : currBlocknumber + parseStep;
        });

        setParingNumber(() => {
          return parsingNumber + 1;
        });
        return events;
      })
      .then((events) => {
        let eventListRaw = [];
        let promises = [];

        events.forEach((element) => {
          promises.push(
            // address is wallet or contract address
            web3.eth.getCode(element.returnValues.owner).then((res) => {
              if (res === "0x") {
                // only push wallet address
                eventListRaw.push({
                  owner: element.returnValues.owner,
                  spender: element.returnValues.spender,
                  blockNumber: element.blockNumber,
                  transactionHash:
                    polygonscanTxPrefix + element.transactionHash,
                });
              }
            })
          );
        });
        Promise.all(promises).then(() => {
          setEvnList(eventList.concat(eventListRaw));
        });
      });
  }

  useInterval(() => {
    if (isParsing && currBlocknumber !== finalBlocknumber) {
      parseEvent(currBlocknumber);
    } else {
      console.log(eventList);
    }
  }, intervalDuration);

  return (
    <div>
      <h3>CBLB contract event parser</h3>
      <div style={{ color: "#FF0050" }}>
        This is a dev tool, use as your own risk!
      </div>
      <div>
        This tool has high network requirements, please use it in a stable
        network environment
      </div>
      <div>
        Instruction: Use chrome + Metamask, make sure your Metamask is unlock,
        and click `Connect wallet`
      </div>
      <div>
        Check our repo:{" "}
        <a href="https://github.com/cblb-app" target="_blank" rel="noreferrer">
          https://github.com/cblb-app
        </a>
      </div>
      <button onClick={handleWalletConnect} disabled={walletAddress !== ""}>
        Connect wallet
      </button>
      {walletAddress !== "" && (
        <>
          <div>Connected at: {walletAddress}</div>
          <div>
            Target contract address:{" "}
            <a
              href={polygonscanAddressPrefix + contractAddress}
              target="_blank"
              rel="noreferrer"
            >
              {contractAddress}
            </a>
          </div>

          <div>Target event: {eventName}</div>
          <div>
            Curr block progress: {currBlocknumber} / {finalBlocknumber}
          </div>
          <div>
            Parse progress:{" "}
            {parseFloat(
              ((currBlocknumber - startBlocknumber) * 100) /
                (finalBlocknumber - startBlocknumber)
            ).toFixed(3)}{" "}
            %
          </div>
          <div>
            Rest parsing time:{" "}
            {parseFloat(
              ((parsingNumber * intervalDuration) /
                1000 /
                ((currBlocknumber - startBlocknumber + 1) /
                  (finalBlocknumber - startBlocknumber)) -
                (parsingNumber * intervalDuration) / 1000) /
                60
            ).toFixed(0)}{" "}
            mins
          </div>
          <div>Total address: {eventList.length}</div>
        </>
      )}
      {walletAddress !== "" && provider !== null && !isParsing && (
        <button onClick={handleParseEvent}>Start parse</button>
      )}
      {eventList.length > 0 && (
        <CSVLink filename={csvFilename} data={eventList}>
          Download
        </CSVLink>
      )}
      {currBlocknumber === finalBlocknumber && (
        <p style={{ color: "#FF0050" }}>Done!</p>
      )}
    </div>
  );
}

export default App;
