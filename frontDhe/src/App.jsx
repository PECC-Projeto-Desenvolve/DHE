import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [encryptedData, setEncryptedData] = useState(null);
  const [iv, setIv] = useState(null);
  //const [encryptedData, setEncryptedData] = useState("dummyEncryptedData");
  //const [iv, setIv] = useState("dummyIV");

  useEffect(() => {
    async function fetchEncryptedData() {
      const response = await fetch('http://localhost:3001/get-encrypted-data');
      const data = await response.json();
      console.log("Fetched Encrypted Data:", data.encryptedMessage);
      console.log("Fetched IV:", data.iv);
      setEncryptedData(data.encryptedMessage);
      setIv(data.iv);
    }
    fetchEncryptedData();
  }, []);

  useEffect(() => {
    if (message) {
        console.log('mensagem', message);
    }
}, [message]);

  async function performKeyExchangeAndDecryption() {
    try{
      const response = await fetch('http://localhost:3001/get-public-key');
      const serverPublicKeyBase64 = await response.text();

      const serverPublicKeyBuffer = new Uint8Array(atob(serverPublicKeyBase64).split("").map(char => char.charCodeAt(0)));

      console.log("IV length (in bytes):", atob(iv ? iv : '').length); // Using a ternary to handle the null state
      console.log("Decryption IV (base64):", iv);


      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-384"
        },
        true,
        ["deriveKey"]
      );

      const clientPublicKey = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
      
      const exchangeResponse = await fetch('http://localhost:3001/send-public-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: btoa(String.fromCharCode(...new Uint8Array(clientPublicKey)))
      });

      const aesDecryptionKeyBase64 = await exchangeResponse.text();
      console.log("Frontend AES Decryption Key (base64):", aesDecryptionKeyBase64);
      const aesDecryptionKey = await window.crypto.subtle.importKey(
        "raw",
        new Uint8Array(atob(aesDecryptionKeyBase64).split("").map(char => char.charCodeAt(0))),
        "AES-CBC",
        true,
        ["decrypt"]
      );
      console.log("Frontend AES Decryption Key (base64):", aesDecryptionKeyBase64);
      console.log("Decoded encryptedMessage length (in bytes):", atob(encryptedData).length);

      try {
        const decryptedData = await window.crypto.subtle.decrypt(
          {
              name: "AES-CBC",
              iv: new Uint8Array(atob(iv).split("").map(char => char.charCodeAt(0)))
          },
          aesDecryptionKey,
          new Uint8Array(atob(encryptedData).split("").map(char => char.charCodeAt(0)))
      );      
        const decoder = new TextDecoder();
        setMessage(decoder.decode(decryptedData));
        console.log(message)
      } catch (err) {
          console.error("Error during decryption:", err);
      }    
    } catch (error) {
      console.error("Decryption Error:", error);   
    }
  }

  return (
    <div className="App">
      <header className="App-header">
      <button onClick={performKeyExchangeAndDecryption} disabled={!encryptedData || !iv}>
        Decrypt Message
      </button>
        <p>{message}</p>
      </header>
    </div>
  );
}

export default App;
