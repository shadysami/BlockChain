"use strict";

let blindSignatures = require('blind-signatures');
let SpyAgency = require('./spyAgency.js').SpyAgency;

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, n, e) {
  return blindSignatures.blind({
    message: msg,
    N: agency.n,
    E: agency.e,
  });
}

function unblind(blindingFactor, sig, n) {
  return blindSignatures.unblind({
    signed: sig,
    N: n,
    r: blindingFactor,
  });
}

let agency = new SpyAgency();

// Prepare 10 documents with 10 different cover identities
let coverNames = [
  "Shadow Fox",
  "Silent Raven",
  "Ghost Walker",
  "Midnight Owl",
  "Crimson Viper",
  "Silver Phantom",
  "Echo Whisper",
  "Frost Jaguar",
  "Velvet Tiger",
  "Dusk Serpent"
];

// Create documents and blind them
let originalDocs = coverNames.map(name => makeDocument(name));
let blindingFactors = [];
let blindDocs = originalDocs.map(doc => {
  let blinded = blindSignatures.blind({
    message: doc,
    N: agency.n,
    E: agency.e
  });
  blindingFactors.push(blinded.r); // Store the blinding factor
  return blinded.blinded;
});

agency.signDocument(blindDocs, (selected, verifyAndSign) => {
  // Prepare arrays excluding the selected document
  let factorsForVerification = blindingFactors.map((factor, index) => 
    index === selected ? undefined : factor
  );
  let docsForVerification = originalDocs.map((doc, index) => 
    index === selected ? undefined : doc
  );

  // Get the blinded signature
  let blindedSignature = verifyAndSign(factorsForVerification, docsForVerification);

  // Unblind the signature for the selected document
  let signature = unblind(blindingFactors[selected], blindedSignature, agency.n);

  // Verify the signature
  let isValid = blindSignatures.verify({
    unblinded: signature,
    N: agency.n,
    E: agency.e,
    message: originalDocs[selected]
  });

  // Optional: console.log to check if verification succeeded
  console.log(`Signature verification for ${coverNames[selected]}: ${isValid}`);
});