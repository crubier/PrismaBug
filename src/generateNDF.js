const fs = require("fs-extra");
const path = require("path");
const { map, range } = require("lodash/fp");
const cuid = require("cuid");
const moment = require("moment");
const AdmZip = require("adm-zip");

/**
 * Create the temp folders required for the ndf zip file creation
 * @param  {String} [tempNdfFolderPath="./temp/NDF"] the path of the folder
 */
async function createTempNDFFolder(tempNdfFolderPath = "./temp/NDF") {
  await fs.remove(tempNdfFolderPath);

  await fs.ensureDir(tempNdfFolderPath);

  await fs.ensureDir(path.join(tempNdfFolderPath, "lists"));
  await fs.ensureDir(path.join(tempNdfFolderPath, "nodes"));
  await fs.ensureDir(path.join(tempNdfFolderPath, "relations"));
}

/**
 * Generate the lists file
 * @param  {String} [tempListFilePath="./temp/NDF/lists/000001.json"] path of the lists file
 */
async function generateTempListFile(
  tempListFilePath = "./temp/NDF/lists/000001.json"
) {
  await fs.ensureFile(tempListFilePath);

  await fs.writeJson(tempListFilePath, { valueType: "lists", values: [] });
}

/**
 * Append the required number of 0 and the json extension to the file number
 * @param  {[type]} fileNumber number of the file
 * @return {String}            name of the file
 */
function generateFileName(fileNumber) {
  switch (fileNumber.toString().length) {
    case 6:
      return `${fileNumber}.json`;
    case 5:
      return `0${fileNumber}.json`;
    case 4:
      return `00${fileNumber}.json`;
    case 3:
      return `000${fileNumber}.json`;
    case 2:
      return `0000${fileNumber}.json`;
    case 1:
      return `00000${fileNumber}.json`;
    default:
      return `000000.json`;
  }
}

/**
 * Generate all the nodes files
 * @param  {String} [tempNodeFolderPath="./temp/NDF/nodes"] path of the nodes folder
 * @return {{missionIds: String[], imageIds: String[]}}     object containing arrays of mission and image ids

 */
async function generateTempNodeFiles(tempNodeFolderPath = "./temp/NDF/nodes") {
  const missionIds = [];
  const imageIds = [];

  await Promise.all(
    map(async fileNumber => {
      const filePath = path.join(
        tempNodeFolderPath,
        generateFileName(fileNumber)
      );
      await fs.ensureFile(filePath);

      let nodes = { valueType: "nodes", values: [] };

      map(nodeNumber => {
        const id = cuid();
        nodes.values.push({
          _typeName: "Mission",
          id: id,
          createdAt: moment(),
          updatedAt: moment()
        });
        missionIds.push(id);
      }, range(1, 100));

      await fs.writeJson(filePath, nodes);
    }, range(1, 100))
  );

  await Promise.all(
    map(async fileNumber => {
      const filePath = path.join(
        tempNodeFolderPath,
        generateFileName(fileNumber)
      );
      await fs.ensureFile(filePath);

      let nodes = { valueType: "nodes", values: [] };

      map(nodeNumber => {
        const id = cuid();
        nodes.values.push({
          _typeName: "Image",
          id: id,
          createdAt: moment(),
          updatedAt: moment()
        });
        imageIds.push(id);
      }, range(1, 100));

      await fs.writeJson(filePath, nodes);
    }, range(101, 2101))
  );
  return { missionIds, imageIds };
}

/**
 * Genere all the relations files
 * @param  {number[]} missionIds                                    array containing the mission ids
 * @param  {number[]} imageIds                                      array containing the image ids
 * @param  {String} [tempRelationFolderPath="./temp/NDF/relations"] path to the relation folder
 */
async function generateTempRelationFiles(
  missionIds,
  imageIds,
  tempRelationFolderPath = "./temp/NDF/relations"
) {
  await Promise.all(
    map(async missionNumber => {
      const filePath = path.join(
        tempRelationFolderPath,
        generateFileName(missionNumber + 1)
      );
      await fs.ensureFile(filePath);

      const imagesToAdd = imageIds.slice(
        missionNumber * 20,
        missionNumber * 20 + 19
      );
      const relations = { valueType: "relations", values: [] };
      map(image => {
        relations.values.push([
          {
            _typeName: "MissionExecution",
            id: missionIds[missionNumber],
            fieldName: "images"
          },
          { _typeName: "Image", id: image, fieldName: "mission" }
        ]);

        fs.writeJson(filePath, relations);
      }, imagesToAdd);
    }, range(0, missionIds.length - 1))
  );
}

/**
 * Zip the ndf folder into a zip file
 * @param  {String} [tempNdfFolderPath="./temp/NDF"] path of the ndf folder
 * @param  {String} [writePath="./ndf.zip"]          path where the zip file will be created
 */
async function zipFile(
  tempNdfFolderPath = "./temp/NDF",
  writePath = "./ndf.zip"
) {
  const zip = new AdmZip();

  zip.addLocalFolder(tempNdfFolderPath);

  await fs.remove(writePath);

  zip.writeZip(writePath);
}

async function main() {
  try {
    console.log("Generating NDF zip file :");
    console.log("Create temporary folder");

    await createTempNDFFolder();

    console.log("Generating list file");

    await generateTempListFile();

    console.log("Generating nodes");

    const { missionIds, imageIds } = await generateTempNodeFiles();

    console.log("Generating relations");
    await generateTempRelationFiles(missionIds, imageIds);

    console.log("Zipping everything");
    await zipFile();

    console.log("Removing temp folder");
    await fs.remove("./temp");

    return 0;
  } catch (e) {
    console.error(e);
    await fs.remove("./temp");
    await fs.remove("./ndf.zip");
    return -1;
  }
}

main();
