import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { rm } from 'node:fs/promises'
import { Exiftool } from '../index.js'
import Debug from 'debug'
const debug = Debug('exiftool:metadata')
debug(Exiftool)

// Set the items to be used for all the tests here as constants.
const testsDir = './__tests__'
const imageDir = './images'
const image1 = `${imageDir}/copper.jpg`
const image2 = `${imageDir}/IMG_1820.jpg`
const image3 = `${imageDir}/IMG_1820.heic`
const image4 = `${imageDir}/strip.jpg`
const RealShortcut = 'BasicShortcut'
const FakeShortcut = 'FakeShortcut'
const NewShortcut = 'MattsNewCut'
const MattsNewCut = `MattsNewCut => ['exif:createdate', 'file:FileName']`

afterAll( async () => {
  try {
    let dir, file 
    dir = __dirname.split('/')
    file = dir.slice(0,dir.length-1).join('/')+'/exiftool.config'
    test = dir.slice(0,dir.length-1).join('/')+'/exiftool.config'
    debug(dir)
    await rm(`${file}.bk`)
    await rm(`${file}.test`)
  } catch (e) {
    debug(e)
  }
})

describe("Exiftool metadata extractor", () => {
  test("it should be an instance of Exiftool", () => {
    expect(new Exiftool()).toBeInstanceOf(Exiftool)
  })

  test("init: should fail without a path arguement", async () => {
    let img = new Exiftool()
    expect(img = await img.init()).toBeFalsy()
  })

  test("init: with a path should return a configured exiftool", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init( image1 )
    expect(img._isDirectory).toBeDefined()
    expect(img).toHaveProperty('_fileStats')
  })

  test("which: exiftool is accessible in the path", async () => {
    let img  = new Exiftool()
    let exif = await img.which()
    expect(exif.value).toMatch(/exiftool/)
  })

  test("setPath: is the path to file or directory", async () => {
    expect.assertions(4)
    let img = new Exiftool()
    // missing path value
    let result1 = await img.setPath()
    expect(result1.value).toBeNull()
    expect(result1.error).toBe("A path to image or directory is required.")
    let result2 = await img.setPath( image1 )
    expect(result2.value).toBeTruthy()
    expect(result2.error).toBeNull()
  })

  test("hasExiftoolConfigFile: check if exiftool.config file is present", async () => {
    expect.assertions(2)
    let img1, img2
    img1 = new Exiftool()
    expect(await img1.hasExiftoolConfigFile()).toBeTruthy()

    img2 = new Exiftool()
    img2._exiftool_config = `${img2._cwd}/exiftool.config.missing`
    expect(await img2.hasExiftoolConfigFile()).toBeFalsy()
  })

  test("createExiftoolConfigFile: can create new exiftool.config file", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init( testsDir )
    img._exiftool_config = `${img._cwd}/exiftool.config.test`
    let result = await img.createExiftoolConfigFile()
    expect(result.value).toBeTruthy()
    expect(img.hasExiftoolConfigFile()).toBeTruthy()
  })

  test("hasShortcut: check exiftool.config for a shortcut", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    let result1 = await img.hasShortcut( RealShortcut )
    expect(result1).toBeTruthy()
    let result2 = await img.hasShortcut( FakeShortcut )
    expect(result2).toBeFalsy()
  })

  test("addShortcut: add a new shortcut to the exiftool.config file", async () => {
    expect.assertions(4)
    let img1 = new Exiftool()
    let result1 = await img1.addShortcut( MattsNewCut )
    debug(result1)
    expect(result1.value).toBeTruthy()
    expect(result1.error).toBeNull()

    // check if new shortcut exists and can be returned
    let img2 = new Exiftool()
    img2 = await img2.init( image1 )
    let result2 = await img2.hasShortcut( NewShortcut )
    expect(result2).toBeTruthy()

    // get metadata using new shortcut
    img2.setShortcut( NewShortcut  )
    debug(img2._command) 
    let metadata = await img2.getMetadata()
    debug(metadata)
    expect(metadata).not.toBeNull()

  })

  test("removeShortcut: remove a given shortcut from the exiftool.config file", async () => {
    let img1 = new Exiftool()
    let result1 = await img1.removeShortcut( NewShortcut )
    debug(result1)
    expect(result1.value).toBeTruthy()
  })

  test("getMetadata: specify tag list as an optional parameter", async () => {
    expect.assertions(2) 
    // test adding additional tags to the command
    let img1 = new Exiftool()
    // init with the copper.jpg image1
    img1 = await img1.init( image1 )
    let result1 = await img1.getMetadata('', '', ['file:FileSize', 'file:DateTimeOriginal', 'file:Model'])
    expect(result1[0]).toHaveProperty('File:FileSize')
    expect(result1[0]).toHaveProperty('EXIF:ImageDescription')
  })

  test("getMetadata: specify new file name and tag list as an optional parameter", async () => {
    // test changing the file from one set in init()
    expect.assertions(2)
    let img2 = new Exiftool()
    // init with copper.jpg image1
    img2 = await img2.init( image1 )
    // replace image1 with IMG_1820.jpg
    let result2 = await img2.getMetadata(image2, '', ['file:FileSize', 'file:DateTimeOriginal', 'file:ImageSize'])
    expect(result2[0]).toHaveProperty('File:FileSize')
    expect(result2[0]).toHaveProperty('Composite:GPSPosition')
  })

  test("getMetadata: specify new shortcut name and tag list as an optional parameter", async () => {
    // test passing a new shortcut name
    let img3 = new Exiftool()
    // image3 is IMG_1820.heic
    img3 = await img3.init( image3 )
    let result3 = await img3.getMetadata('', 'MattsNewCut', ['file:FileSize', 'file:ImageSize'])
    expect(result3[0]).toHaveProperty('SourceFile')
  })

  test("getMetadata: catch the forbidden -all= data stripping tag", async () => {
    // test catching the -all= stripping tag in get request
    let img4 = new Exiftool()
    // init with the copper.jpg image1
    img4 = await img4.init( image1 )
    try {
      let result4 = await img4.getMetadata('', '', '-all= ')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  test("stripMetadata: strip all the metadata out of a file and keep a backup of the original file", async () => {
    expect.assertions(2)
    let img1 = new Exiftool()
    // init with strip.jpg image 4
    img1 = await img1.init( image4 )
    let result = await img1.stripMetadata()
    expect(result.value).toBeTruthy()
    expect(result.original).toMatch(/_original/)
  })

})
