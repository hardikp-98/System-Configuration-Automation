const fs = require('fs');
const path = require('path');

// Function to find and update the specified key in the JSON object
function setNestedValue(obj, path, value) {
  const keys = path.split('.').reduce((result, key) => {
    const matches = key.match(/(.*?)\[(\d+)\]/);
    if (matches) {
      const propName = matches[1];
      const index = parseInt(matches[2]);
      result.push({ propName, index });
    } else {
      result.push({ propName: key, index: undefined });
    }
    return result;
  }, []);

  keys.reduce((acc, { propName, index }, currentIndex) => {
    if (index !== undefined && Array.isArray(acc[propName])) {
      if (currentIndex === keys.length - 1) {
        acc[propName][index] = value;
      } else {
        acc[propName][index] = acc[propName][index] || {};
      }
      return acc[propName][index];
    } else if (currentIndex === keys.length - 1) {
      acc[propName] = value;
    } else {
      acc[propName] = acc[propName] || {};
      return acc[propName];
    }
  }, obj);
}

// Function to find and update the specified key in the JSON object
function findAndUpdateKey(obj, targetKey, value, currentPath = '') {
  var oldTargetKey = targetKey;
  var key1 = targetKey.match(/[^.[\]]+/)[0];

  for (const key in obj) {
    var current = currentPath;
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    if (key == key1) {
      setNestedValue(obj, oldTargetKey, value);
      console.log("\x1b[32m", `Updated JSON config key "${current + '.' + oldTargetKey}" to "${value}"`);
      logToFile(`Updated JSON config key "${current + '.' + oldTargetKey}" to "${value}"`);
      continue;
    } else if (typeof obj[key] == 'object') {
      if (findAndUpdateKey(obj[key], targetKey, value, newPath)) {
        return true;
      }
    }
  }
  return false;
}

// Function to read and update JSON content in a file
function updateJsonFile(filePath, input, output) {
  try {
    var data = fs.readFileSync(filePath, 'utf8');
    var flag = 0;
    if (data.includes("module")) {
      flag = 1;
      var data = fs.readFileSync(filePath, 'utf8').replace("module.exports =", "").replace(';', '').replace(/(?<=\s|^)(\w+)(?=\s*:)/g, '"$1"');
    }
    const config = JSON.parse(data);
    findAndUpdateKey(config, input, output);

    if (flag == 1) {
      fs.writeFileSync(filePath, "module.exports =" + JSON.stringify(config, null, 2).replace(/"\s*(\w+)\s*"\s*:/g, '$1:')+ ";");
    } else {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    }
  } catch (error) {
    console.error('Error updating JSON content:', error.message);
    logToFile(`Error updating JSON content: ${error.message}`);
  }
}

// Function to get current date and time
function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString(); // Adjust the date format as per your preference
}

// Function to write log messages to a file
function logToFile(message) {
  const currentDate = getCurrentDateTime().split('T')[0]; // Extract date from the current date time

  // Create the log folder if it doesn't exist
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder);
  }

  const logFilePath = path.join(logFolder, `${currentDate}_techconf.log`); // Construct the log file path
  const logMessage = `${getCurrentDateTime()} - ${message}\n`; // Add date time to the log message

  fs.appendFileSync(logFilePath, logMessage); // Append the log message to the log file
}

// Function to replace lines in a non-JSON configuration file
function configReplaceLine(filename, input, output, confname = '') {
  try {
    const filenamePath = filename;
    const inputColumn = input;
    const outputColumn = output;

    // Construct the full file path
    const filePath = filenamePath; // path.join(sourcepath, filenamePath);

    // Read the file contents
    let fileContents = fs.readFileSync(filePath, 'utf8');
    // Split the file contents into lines
    const lines = fileContents.split('\n');

    // Iterate through the lines and replace the matching line
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].includes(inputColumn)) {
        lines[j] = outputColumn;
      }
    }

    // Join the lines back into a single string
    fileContents = lines.join('\n');

    // Write the modified contents back to the file
    fs.writeFileSync(filePath, fileContents, 'utf8');

    console.log("\x1b[32m", `Configuration - ${outputColumn} is successful!`);
    logToFile(`Configuration - ${outputColumn} is successful!`);
    } 
    catch (e) {
    console.log(`Exception error occurred at ${e}`);
    logToFile(`Exception error occurred at ${e}`);
  }
}

// Main function to read the config.json and apply updates based on file extension
function updateConfig(configPath) {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const techconfig = JSON.parse(data);

    for (const entry of techconfig) {
      var Path = entry.path;
      var filePath = path.join(sourcepath, Path).replace(/\\/g, '\\\\');

      copyFileAsBackup(filePath, backupFilePath);

      console.log("\x1b[33m", filePath);
      var extension = entry.extension;
      filePath = eval("`" + filePath + "`");

      var changes = entry.changes;
      for (var change of changes) {
        var { input, output } = change;
        output = eval("`" + output + "`").replace("#&#", "${");
        if (extension === 'json') {
          updateJsonFile(filePath, input, output);
        } else {
          configReplaceLine(filePath, input, output);
        }
      }
    }
  } catch (error) {
    console.error('Error updating techconfig:', error.message);
    logToFile(`Error updating techconfig: ${error.message}`);
  }
}

function copyFileAsBackup(sourcePath, backupFolderPath) {
  sourcePath=eval('`'+sourcePath+'`')
  const fileNameWithExtension = path.basename(sourcePath);
  const fileNameWithoutExtension = path.parse(fileNameWithExtension).name;
  const extension = path.extname(fileNameWithExtension);

  const newBackupDir = path.join(backupFolderPath, path.dirname(path.relative('/', sourcePath)), fileNameWithoutExtension);

  if (!fs.existsSync(newBackupDir)) {
    fs.mkdirSync(newBackupDir, { recursive: true });
  }

  const backupFilePath = path.join(newBackupDir, fileNameWithExtension);

  try {
    fs.copyFileSync(sourcePath, backupFilePath);
    console.log('Backup created successfully:', backupFilePath);
    logToFile(`Backup created successfully: ${backupFilePath}`);
  } catch (err) {
    console.error('Error creating backup:', err.message);
    logToFile(`Error creating backup: ${err.message}`);
  }
}


const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/[^\d]/g, '-');
const backupFilePath = `../filebackup/${timestamp}/`;
const configFile = '../config/config.json';
const readconfigFile = fs.readFileSync(configFile, 'utf8');
const config = JSON.parse(readconfigFile);
const sourcepath = config.sourcepath;
const logFolder = "../log/"; // Set the log folder path

// Usage: Provide the path to the techconfig.json file
const configPath = './techconfig.json';
console.log("\x1b[34m", "STARTING.....");
logToFile("Script Started");

updateConfig(configPath);

console.log("\x1b[34m", "ENDING.....");
logToFile("Script Ended");