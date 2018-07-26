const fs = require("fs-extra");
const path = require("path");
const { map, range } = require("lodash/fp");
const cuid = require("cuid");
const moment = require("moment");
const AdmZip = require("adm-zip");

async function generateTempNDFFolder(tempFilePath = "./temp/NDF") {
  await fs.remove(tempFilePath);

  await fs.ensureDir(tempFilePath);

  await fs.ensureDir(path.join(tempFilePath, "lists"));
  await fs.ensureDir(path.join(tempFilePath, "nodes"));
  await fs.ensureDir(path.join(tempFilePath, "relations"));
}

async function generateTempListFile(
  tempListFilePath = "./temp/NDF/lists/000001.json"
) {
  await fs.ensureFile(tempListFilePath);

  await fs.writeJson(tempListFilePath, { valueType: "lists", values: [] });
}

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

async function zipFile(tempNdfFolder = "./temp/NDF", writePath = "./ndf.zip") {
  const zip = new AdmZip();

  zip.addLocalFolder(tempNdfFolder);

  await fs.remove(writePath);

  zip.writeZip(writePath);
}

async function main() {
  try {
    console.log("Generating NDF zip file :");
    console.log("Create temporary folder");

    await generateTempNDFFolder();

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
