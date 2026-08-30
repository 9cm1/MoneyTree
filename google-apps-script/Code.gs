'use strict';

const MONEY_TREE_DEFAULTS = Object.freeze({
  firebaseWebApiKey: 'AIzaSyAB2vdiwyC3cQGnczRTeL0JptHl70ImtAE',
  firebaseProjectId: 'money-tree-loan-app',
  allowedParentOrigins: [
    'https://9cm1.github.io',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
  ],
  maximumFileSizeMb: 5,
  maximumUploadsPerTenMinutes: 5,
  rootFolderName: 'Money Tree - Private Loan Documents'
});

/**
 * Run this once from the Apps Script editor while signed in as the Drive owner.
 * The trailing underscore keeps the function private from google.script.run.
 */
function setupMoneyTreeDrive_() {
  const properties = PropertiesService.getScriptProperties();
  let folder = null;
  const existingId = properties.getProperty('ROOT_FOLDER_ID');

  if (existingId) {
    try {
      folder = DriveApp.getFolderById(existingId);
    } catch (error) {
      folder = null;
    }
  }

  if (!folder) {
    folder = DriveApp.createFolder(MONEY_TREE_DEFAULTS.rootFolderName);
  }

  properties.setProperties({
    ROOT_FOLDER_ID: folder.getId(),
    FIREBASE_WEB_API_KEY: MONEY_TREE_DEFAULTS.firebaseWebApiKey,
    FIREBASE_PROJECT_ID: MONEY_TREE_DEFAULTS.firebaseProjectId,
    ALLOWED_PARENT_ORIGINS: MONEY_TREE_DEFAULTS.allowedParentOrigins.join(','),
    MAXIMUM_FILE_SIZE_MB: String(MONEY_TREE_DEFAULTS.maximumFileSizeMb)
  }, false);

  const result = {
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    folderName: folder.getName(),
    sharingInstruction: 'Keep this folder Restricted. Share it only with named Money Tree administrators.'
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function doGet(event) {
  const channel = cleanString_(event && event.parameter && event.parameter.channel, 120);
  if (!/^[A-Za-z0-9-]{20,120}$/.test(channel)) {
    return HtmlService.createHtmlOutput('Open this uploader from the Money Tree application page.');
  }

  const settings = getSettings_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.channelJson = JSON.stringify(channel);
  template.allowedOriginsJson = JSON.stringify(settings.allowedParentOrigins);
  template.maximumFileSizeMb = settings.maximumFileSizeMb;

  return template.evaluate()
    .setTitle('Money Tree secure document upload')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Receives a form from the embedded Apps Script page. The form must remain the
 * only argument so its three file inputs arrive as Blob objects.
 */
function processLoanDocuments(formObject) {
  if (!formObject || typeof formObject !== 'object') {
    throw new Error('The upload form was not received.');
  }

  const settings = getSettings_();
  const context = {
    idToken: cleanString_(formObject.idToken, 5000),
    userId: cleanString_(formObject.userId, 128),
    email: cleanString_(formObject.email, 254).toLowerCase(),
    fullName: cleanString_(formObject.fullName, 120),
    employeeNumber: cleanString_(formObject.employeeNumber, 40),
    nrcNumber: cleanString_(formObject.nrcNumber, 30),
    applicationNumber: cleanString_(formObject.applicationNumber, 40),
    loanId: cleanString_(formObject.loanId, 64),
    parentOrigin: cleanString_(formObject.parentOrigin, 200)
  };

  validateContext_(context, settings);
  const verifiedUser = verifyFirebaseUser_(context.idToken, settings.firebaseWebApiKey);
  const verifiedEmail = cleanString_(verifiedUser.email, 254).toLowerCase();

  if (verifiedUser.localId !== context.userId || verifiedEmail !== context.email) {
    throw new Error('The signed-in user does not match this application.');
  }
  if (verifiedUser.emailVerified === false) {
    throw new Error('Verify your email address before uploading loan documents.');
  }

  const documents = {
    nrcFront: validateDocument_(formObject.nrcFront, 'NRC front', settings.maximumFileSizeBytes),
    nrcBack: validateDocument_(formObject.nrcBack, 'NRC back', settings.maximumFileSizeBytes),
    payslip: validateDocument_(formObject.payslip, 'Recent payslip', settings.maximumFileSizeBytes)
  };

  enforceUploadRateLimit_(context.userId, settings.maximumUploadsPerTenMinutes);

  const rootFolder = getRootFolder_(settings.rootFolderId);
  const folderName = [
    context.applicationNumber,
    context.userId.slice(0, 12),
    safeFilePart_(context.employeeNumber, 30)
  ].join(' - ');
  const applicationFolder = getOrCreateChildFolder_(rootFolder, folderName);
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Africa/Lusaka', 'yyyyMMdd-HHmmss');
  const receiptId = Utilities.getUuid();

  const savedFiles = {
    nrcFront: saveDocument_(applicationFolder, documents.nrcFront, 'NRC FRONT', context, timestamp),
    nrcBack: saveDocument_(applicationFolder, documents.nrcBack, 'NRC BACK', context, timestamp),
    payslip: saveDocument_(applicationFolder, documents.payslip, 'PAYSLIP', context, timestamp)
  };

  const receipt = {
    receiptId,
    applicationNumber: context.applicationNumber,
    loanId: context.loanId,
    userId: context.userId,
    borrowerEmail: context.email,
    fullName: context.fullName,
    employeeNumber: context.employeeNumber,
    nrcNumber: context.nrcNumber,
    uploadedAt: now.toISOString(),
    folderId: applicationFolder.getId(),
    files: savedFiles
  };

  applicationFolder.createFile(
    `UPLOAD RECEIPT - ${timestamp} - ${receiptId}.json`,
    JSON.stringify(receipt, null, 2),
    MimeType.PLAIN_TEXT
  );
  recordSuccessfulUpload_(context.userId);

  return {
    receiptId: receipt.receiptId,
    applicationNumber: receipt.applicationNumber,
    loanId: receipt.loanId,
    userId: receipt.userId,
    fullName: receipt.fullName,
    employeeNumber: receipt.employeeNumber,
    nrcNumber: receipt.nrcNumber,
    uploadedAt: receipt.uploadedAt,
    folderId: receipt.folderId,
    files: {
      nrcFront: { name: savedFiles.nrcFront.name },
      nrcBack: { name: savedFiles.nrcBack.name },
      payslip: { name: savedFiles.payslip.name }
    }
  };
}

function getSettings_() {
  const properties = PropertiesService.getScriptProperties();
  const maximumFileSizeMb = Math.min(10, Math.max(
    1,
    Number(properties.getProperty('MAXIMUM_FILE_SIZE_MB')) || MONEY_TREE_DEFAULTS.maximumFileSizeMb
  ));
  const allowedParentOrigins = (properties.getProperty('ALLOWED_PARENT_ORIGINS') || MONEY_TREE_DEFAULTS.allowedParentOrigins.join(','))
    .split(',')
    .map(function (origin) { return origin.trim(); })
    .filter(Boolean);

  return {
    rootFolderId: properties.getProperty('ROOT_FOLDER_ID') || '',
    firebaseWebApiKey: properties.getProperty('FIREBASE_WEB_API_KEY') || MONEY_TREE_DEFAULTS.firebaseWebApiKey,
    firebaseProjectId: properties.getProperty('FIREBASE_PROJECT_ID') || MONEY_TREE_DEFAULTS.firebaseProjectId,
    allowedParentOrigins,
    maximumFileSizeMb,
    maximumFileSizeBytes: maximumFileSizeMb * 1024 * 1024,
    maximumUploadsPerTenMinutes: MONEY_TREE_DEFAULTS.maximumUploadsPerTenMinutes
  };
}

function validateContext_(context, settings) {
  if (!context.idToken || context.idToken.length < 100) throw new Error('Your login token is missing. Sign in again.');
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(context.userId)) throw new Error('The user identifier is invalid.');
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(context.loanId)) throw new Error('The loan identifier is invalid.');
  if (!/^MT-[0-9]{8}-[A-Z0-9]{6}$/.test(context.applicationNumber)) throw new Error('The application number is invalid.');
  if (!/^.{2,120}$/.test(context.fullName)) throw new Error('Enter the borrower full name.');
  if (!/^[A-Za-z0-9 /_-]{2,40}$/.test(context.employeeNumber)) throw new Error('The employee number is invalid.');
  if (!/^[A-Za-z0-9 /_-]{5,30}$/.test(context.nrcNumber)) throw new Error('The NRC number is invalid.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.email)) throw new Error('The signed-in email is invalid.');
  if (settings.allowedParentOrigins.indexOf(context.parentOrigin) === -1) throw new Error('This upload did not come from an approved Money Tree website.');
  if (!settings.rootFolderId) throw new Error('The administrator has not completed the private Drive setup.');
}

function verifyFirebaseUser_(idToken, apiKey) {
  const response = UrlFetchApp.fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken }),
      muteHttpExceptions: true
    }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Your Money Tree login could not be verified. Sign in again.');
  }
  const payload = JSON.parse(response.getContentText() || '{}');
  if (!payload.users || !payload.users.length) {
    throw new Error('No verified user was found for this upload.');
  }
  return payload.users[0];
}

function validateDocument_(blob, label, maximumBytes) {
  if (!blob || typeof blob.getBytes !== 'function') throw new Error(`${label} is required.`);
  const originalName = cleanString_(blob.getName(), 150);
  const mimeType = cleanString_(blob.getContentType(), 100).toLowerCase();
  const extensionMatch = originalName.toLowerCase().match(/\.(pdf|jpe?g|png)$/);
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!extensionMatch || allowedMimeTypes.indexOf(mimeType) === -1) {
    throw new Error(`${label} must be a PDF, JPG or PNG file.`);
  }
  const sizeBytes = blob.getBytes().length;
  if (sizeBytes <= 0) throw new Error(`${label} is empty.`);
  if (sizeBytes > maximumBytes) {
    throw new Error(`${label} is larger than ${Math.round(maximumBytes / 1024 / 1024)} MB.`);
  }
  return { blob, originalName, mimeType, extension: extensionMatch[1].replace('jpeg', 'jpg'), sizeBytes };
}

function saveDocument_(folder, document, label, context, timestamp) {
  const storedName = `${label} - ${context.applicationNumber} - ${timestamp}.${document.extension}`;
  const file = folder.createFile(document.blob.copyBlob().setName(storedName));
  file.setDescription([
    `Money Tree application: ${context.applicationNumber}`,
    `Employee number: ${context.employeeNumber}`,
    `Original filename: ${document.originalName}`,
    `Uploaded by Firebase user: ${context.userId}`
  ].join('\n'));
  return {
    name: storedName,
    originalName: document.originalName,
    fileId: file.getId(),
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes
  };
}

function getRootFolder_(folderId) {
  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error('The private document folder is unavailable. The administrator must run setup again.');
  }
}

function getOrCreateChildFolder_(parent, name) {
  const matches = parent.getFoldersByName(name);
  return matches.hasNext() ? matches.next() : parent.createFolder(name);
}

function enforceUploadRateLimit_(userId, maximum) {
  const cache = CacheService.getScriptCache();
  const key = `upload-count-${userId}`;
  const count = Number(cache.get(key)) || 0;
  if (count >= maximum) {
    throw new Error('Too many upload attempts. Wait ten minutes and try again.');
  }
}

function recordSuccessfulUpload_(userId) {
  const cache = CacheService.getScriptCache();
  const key = `upload-count-${userId}`;
  const count = Number(cache.get(key)) || 0;
  cache.put(key, String(count + 1), 600);
}

function cleanString_(value, maximumLength) {
  return String(value == null ? '' : value).trim().slice(0, maximumLength);
}

function safeFilePart_(value, maximumLength) {
  return cleanString_(value, maximumLength)
    .replace(/[^A-Za-z0-9 _-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'UNKNOWN';
}
