/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/index.js The Exiftool class definition file.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'
import Debug from 'debug'
import * as fxp from 'fast-xml-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cmd = promisify(exec)
const debug = Debug('exiftool:metadata')

/**
 * A class wrapping the exiftool metadata tool.
 * @summary A class wrapping the exiftool image metadata extraction tool.
 * @class Exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */
export class Exiftool {
  /**
   * Create an instance of the exiftool wrapper.
   * @param { string } imagePath - String value of file path to an image file or directory of images.
   * @param { boolean } [test] - Set to true to test outcome of exiftool command not found.
   */
  constructor(imagePath, test) {
    debug('constructor method entered')
    this._test = test ?? false
    this._imgDir = imagePath ?? null
    this._path = imagePath ?? null
    this._isDirectory = null
    this._fileStats = null
    this._cwd = __dirname
    this._exiftool_config = `"${this._cwd}/exiftool.config"`
    this._extensionsToExclude = ['txt', 'js', 'json', 'mjs', 'cjs', 'md', 'html', 'css']
    this._executable = null
    this._version = null
    this._opts = {}
    this._opts.exiftool_config = `-config ${this._exiftool_config}`
    this._opts.outputFormat = '-json'
    this._opts.tagList = null
    this._opts.shortcut = '-BasicShortcut'
    this._opts.includeTagFamily = '-groupNames'
    this._opts.compactFormat = '-s3'
    this._opts.quiet = '-quiet'
    this._opts.excludeTypes = ''
    this._opts.binaryFormat = ''
    this._opts.gpsFormat = ''
    this._opts.structFormat = ''
    this._opts.useMWG = ''
    this._opts.overwrite_original = ''
    this._command = null
    this.orderExcludeTypesArray()
  }

  /**
   * Initializes some asynchronus properties.
   * @summary Initializes some asynchronus class properties not done in the constructor.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } imagePath - A file system path to set for exiftool to process.
   * @return { (Exiftool|boolean) } Returns fully initialized instance or false.
   */
  async init(imagePath) {
    debug('init method entered')
    try {
      if (this._executable === null) {
        this._executable = await this.which()
        // const result = await this.which()
        // this._executable = result.value
        this._version = await this.version()
      }
      debug('setting the command string')
      this.setCommand()
    } catch (e) {
      // debug('could not find exiftool command')
      // debug(e)
      throw new Error('ATTENTION!!! exiftool IS NOT INSTALLED.  You can get exiftool at https://exiftool.org/install.html', { cause: e })
    }
    if ((imagePath === '' || typeof imagePath === 'undefined') && this._path === null) {
      debug('Param: path - was undefined.')
      debug(`Instance property: path - ${this._path}`)
      return false
    }
    try {
      await this.setPath(imagePath)
    } catch (e) {
      debug(e)
      throw e
    }
    try {
      debug('checking if config file exists.')
      if (await this.hasExiftoolConfigFile()) {
        debug('exiftool.config file exists')
      } else {
        debug('missing exiftool.config file')
        debug('attempting to create basic exiftool.config file')
        const result = this.createExiftoolConfigFile()
        if (!result.value && result.error) {
          debug('failed to create new exiftool.config file')
          throw new Error(result.error)
        }
        debug('new exiftool.config file created')
      }
    } catch (e) {
      debug('could not create exiftool.config file')
      debug(e)
    }
    return this
  }

  /**
   * Set ExifTool to overwrite the original image file when writing new tag data.
   * @summary Set ExifTool to overwrite the original image file when writing new tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { boolean } enabled - True/False value to enable/disable overwriting the original image file.
   * @return { undefined }
   */
  setOverwriteOriginal(enabled) {
    if (enabled) {
      debug('setting -overwrite_original option')
      this._opts.overwrite_original = '-overwrite_original'
    } else {
      this._opts.overwrite_original = ''
    }
  }

  /**
   * Set ExifTool to extract binary tag data.
   * @summary Set ExifTool to extract binary tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { boolean } enabled - True/False value to enable/disable binary tag extraction.
   * @return { undefined }
   */
  enableBinaryTagOutput(enabled) {
    if (enabled) {
      this._opts.binaryFormat = '-binary'
    } else {
      this._opts.binaryFormat = ''
    }
    this.setCommand()
  }

  /**
   * Set ExifTool output format.
   * @summary Set Exiftool output format.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } [fmt='json'] - Output format to set, default is JSON, but can be XML.
   * @return { Boolean } - Return True if new format is set, False otherwise.
   */
  setOutputFormat(fmt = 'json') {
    let newFormat
    const match = fmt.match(/(?<format>xml|json)/i)
    if (match || match.groups?.format) {
      newFormat = (match.groups.format === 'xml') ? '-xmlFormat' : '-json'
      this._opts.outputFormat = newFormat
      debug(`Output format is set to ${this._opts.outputFormat}`)
      this.setCommand()
      return true
    }
    debug(`Output format ${fmt} not supported.`)
    return false
  }

  /**
   * Set ExifTool output formatting for GPS coordinate data.
   * @summary Set ExifTool output formatting for GPS coordinate data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } [fmt=default] - printf format string with specifiers for degrees, minutes and seconds.
   * @see {@link https://exiftool.org/exiftool_pod.html#c-FMT--coordFormat}
   * @return { undefined }
   */
  setGPSCoordinatesOutputFormat(fmt = 'default') {
    const groups = fmt.match(/(?<signed>\+)?(?<gps>gps)/i)?.groups
    if (fmt.toLowerCase() === 'default') {
      // revert to default formatting
      this._opts.coordFormat = ''
    } else if (groups?.gps === 'gps') {
      this._opts.coordFormat = `-coordFormat %${(groups?.signed ? '+' : '')}.6f`
    } else {
      this._opts.coordFormat = `-coordFormat ${fmt}`
    }
  }

  /**
   * Set ExifTool to extract xmp struct tag data.
   * @summary Set ExifTool to extract xmp struct tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { boolean } enabled - True/False value to enable/disable xmp struct tag extraction.
   * @return { undefined }
   */
  enableXMPStructTagOutput(enabled) {
    if (enabled) {
      this._opts.structFormat = '-struct'
    } else {
      this._opts.structFormat = ''
    }
  }

  /**
   * Tell exiftool to use the Metadata Working Group (MWG) module for overlapping EXIF, IPTC, and XMP tqgs.
   * @summary Tell exiftool to use the MWG module for overlapping tag groups.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { boolean } - True/false value to enable/disable mwg module.
   * @return { undefined }
   */
  useMWG(enabled) {
    if (enabled) {
      this._opts.useMWG = '-use MWG'
    } else {
      this._opts.useMGW = ''
    }
  }

  /**
   * Set the path for image file or directory of images to process with exiftool.
   * @summary Set the path of image file or directory of images to process with exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } imagePath - A file system path to set for exiftool to process.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setPath(imagePath) {
    debug('setPath method entered')
    const o = { value: null, error: null }
    if (typeof imagePath === 'undefined' || imagePath === null) {
      o.error = 'A path to image or directory is required.'
      return o
    }
    let pathToImage
    if (Array.isArray(imagePath)) {
      let temp = imagePath.map((i) => `"${path.resolve('.', i)}"`)
      temp = temp.join(' ')
      debug(`imagePath passed as an Array.  Resolving and concatting the paths into a single string: ${temp}`)
      pathToImage = temp
    } else {
      pathToImage = `"${path.resolve('.', imagePath)}"`
    }
    if (!/^(")?\//.test(pathToImage)) {
      // the path parameter must be a fully qualified file path, starting with /
      throw new Error('The file system path to image must be a fully qualified path, starting from root /.')
    }
    try {
      this._path = pathToImage
      if (/^"/.test(pathToImage)) {
        this._fileStats = await stat(pathToImage.slice(1, -1))
      } else {
        this._fileStats = await stat(pathToImage)
      }
      this._isDirectory = this._fileStats.isDirectory()
      if (this._fileStats.isDirectory()) {
        this._imgDir = pathToImage
      }
      this.setCommand()
      o.value = true
    } catch (e) {
      debug(e)
      o.error = e.message
      o.errorCode = e.code
      o.errorStack = e.stack
    }
    return o
  }

  /**
   * Get the fully qualified path to the image (or directory) specified in init.
   * @summary Get the full qualified path to the image.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { Object } Returns an object literal with success or error messages.
   */
  async getPath() {
    debug('getPath method entered')
    const o = { value: null, error: null }
    if (this._path === null || typeof this._path === 'undefined' || this._path === '') {
      o.error = 'Path to an image file or image directory is not set.'
    } else {
      o.value = true
      o.file = (this._isDirectory) ? null : path.basename(this._path)
      o.dir = (this._isDirectory) ? this._path : path.dirname(this._path)
      o.path = this._path
    }
    return o
  }

  /**
   * Check to see if the exiftool.config file is present at the expected path.
   * @summary Check to see if the exiftool.config file is present at the expected path.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { boolean } Returns True if present, False if not.
   */
  async hasExiftoolConfigFile() {
    debug('hasExiftoolConfigFile method entered')
    debug('>')
    let exists = false
    const file = this._exiftool_config
    let stats
    try {
      debug('>>')
      if (/^"/.test(file)) {
        stats = await stat(file.slice(1, -1))
      } else {
        stats = await stat(file)
      }
      debug('>>>')
      debug(stats)
      exists = true
    } catch (e) {
      debug('>>>>')
      debug(e)
      exists = false
    }
    debug('>>>>>')
    return exists
  }

  /**
   * Create the exiftool.config file if it is not present.
   * @summary Create the exiftool.config file if it is not present.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { Object } Returns an object literal with success or error messages.
   */
  async createExiftoolConfigFile() {
    debug('createExiftoolConfigFile method entered')
    const o = { value: null, error: null }
    const stub = `%Image::ExifTool::UserDefined::Shortcuts = (
    BasicShortcut => ['file:Directory','file:FileName','EXIF:CreateDate','file:MIMEType','exif:Make','exif:Model','exif:ImageDescription','iptc:ObjectName','iptc:Caption-Abstract','iptc:Keywords','Composite:GPSPosition'],
    Location => ['EXIF:GPSLatitudeRef', 'EXIF:GPSLatitude', 'EXIF:GPSLongitudeRef', 'EXIF:GPSLongitude', 'EXIF:GPSAltitudeRef', 
    'EXIF:GPSSpeedRef', 'EXIF:GPSAltitude', 'EXIF:GPSSpeed', 'EXIF:GPSImgDirectionRef', 'EXIF:GPSImgDirection', 'EXIF:GPSDestBearingRef', 'EXIF:GPSDestBearing', 
    'EXIF:GPSHPositioningError', 'Composite:GPSAltitude', 'Composite:GPSLatitude', 'Composite:GPSLongitude', 'Composite:GPSPosition', 'XMP:Location*', 'XMP:LocationCreatedGPSLatitude',
  'XMP:LocationCreatedGPSLongitude', 'XMP:LocationShownGPSLatitude', 'XMP:LocationShownGPSLongitude'],
    StripGPS => ['gps:all='],
);`
    // let fileName = `${this._cwd}/exiftool.config`
    const fileName = this._exiftool_config
    const echo = `echo "${stub}" > ${fileName}`
    try {
      debug('attemtping to create exiftool.config file')
      const result = cmd(echo)
      debug(result.stdout)
      o.value = true
    } catch (e) {
      debug('failed to create new exiftool.config file')
      debug(e)
      o.error = e.message
      o.errorCode = e.code
      o.errorStack = e.stack
    }
    return o
  }

  /**
   * Set the GPS location to point to a new point.
   * @summary Set the GPS location to point to a new point.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { Object } coordinates - New GPS coordinates to assign to image.
   * @param { Number } coordinates.latitude - Latitude component of location.
   * @param { Number } coordinates.longitude - Longitude component of location.
   * @param { String } [coordinates.city] - City name to be assigned using MWG composite method.
   * @param { String } [coordinates.state] - State name to be assigned using MWG composite method.
   * @param { String } [coordindates.country] - Country name to be assigned using MWG composite method.
   * @param { String } [coordindates.countryCode] - Country code to be assigned using MWG composite method.
   * @param { String } [coordinates.location] - Location name to be assigned using MWG composite method.
   * @throws { Error } Throws an error if no image is set yet.
   * @return { Object } Object literal with stdout or stderr.
   */
  async setLocation(coordinates) {
    if (!this._path) {
      throw new Error('No image file set yet.')
    }
    try {
      const lat = parseFloat(coordinates?.latitude) ?? null
      const latRef = `${(lat > 0) ? 'N' : 'S'}`
      const lon = parseFloat(coordinates?.longitude) ?? null
      const lonRef = `${(lon > 0) ? 'E' : 'W'}`
      const alt = 10000
      const altRef = 0
      let command = `${this._executable} `
      if (lat && lon) {
        command += `-GPSLatitude=${lat} -GPSLatitudeRef=${latRef} -GPSLongitude=${lon} -GPSLongitudeRef=${lonRef} -GPSAltitude=${alt} -GPSAltitudeRef=${altRef} `
                + `-XMP:LocationShownGPSLatitude=${lat} -XMP:LocationShownGPSLongitude=${lon}`
      }
      if (coordinates?.city !== undefined) {
        command += ` -IPTC:City='${coordinates.city}' -XMP-iptcExt:LocationShownCity='${coordinates.city}' -XMP:City='${coordinates.city}'`
        // command += ` -MWG:City='${coordinates.city}'`
      }
      if (coordinates?.state !== undefined) {
        command += ` -IPTC:Province-State='${coordinates.state}' -XMP-iptcExt:LocationShownProvinceState='${coordinates.state}' -XMP:Country='${coordinates.state}'`
        // command += ` -MWG:State='${coordinates.state}'`
      }
      if (coordinates?.country !== undefined) {
        command += ` -IPTC:Country-PrimaryLocationName='${coordinates.country}' -XMP:LocationShownCountryName= -XMP:LocationShownCountryName='${coordinates.country}' -XMP:Country='${coordinates.country}'`
        // command += ` -MWG:Country='${coordinates.country}'`
      }
      if (coordinates?.countryCode !== undefined) {
        command += ` -IPTC:Country-PrimaryLocationCode='${coordinates.countryCode}' -XMP:LocationShownCountryCode= -XMP:LocationShownCountryCode='${coordinates.countryCode}' -XMP:CountryCode='${coordinates.countryCode}'`
        // command += ` -MWG:Country='${coordinates.country}'`
      }
      if (coordinates?.location !== undefined) {
        command += ` -IPTC:Sub-location='${coordinates.location}' -XMP-iptcExt:LocationShownSublocation='${coordinates.location}' -XMP:Location='${coordinates.location}'`
        // command += ` -MWG:Location='${coordinates.location}'`
      }
      command += ` -struct -codedcharacterset=utf8 ${this._path}`
      debug(command)
      const result = await cmd(command)
      result.exiftool_command = command
      debug('set new location: %o', result)
      return result
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Set the GPS location to point to null island.
   * @summary Set the GPS location to point to null island.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throws an error if no image is set yet.
   * @return { Object } Object literal with stdout or stderr.
   */
  async nullIsland() {
    if (!this._path) {
      throw new Error('No image file set yet.')
    }
    try {
      const latitude = 0.0
      const latRef = 'S'
      const longitude = 0.0
      const longRef = 'W'
      const alt = 10000
      const altRef = 0
      const command = `${this._executable} -GPSLatitude=${latitude} -GPSLatitudeRef=${latRef} -GPSLongitude=${longitude} -GPSLongitudeRef=${longRef} -GPSAltitude=${alt} -GPSAltitudeRef=${altRef} ${this._path}`
      const result = await cmd(command)
      result.exiftool_command = command
      debug('null island: %o', result)
      return result
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Set the GPS location to point nemo.
   * @summary Set the GPS location to point nemo.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throws an error if no image is set yet.
   * @return { Object } Object literal with stdout or stderr.
   */
  async nemo() {
    if (!this._path) {
      throw new Error('No image file set yet.')
    }
    try {
      const latitude = 22.319469
      const latRef = 'S'
      const longitude = 114.189505
      const longRef = 'W'
      const alt = 10000
      const altRef = 0
      const command = `${this._executable} -GPSLatitude=${latitude} -GPSLatitudeRef=${latRef} -GPSLongitude=${longitude} -GPSLongitudeRef=${longRef} -GPSAltitude=${alt} -GPSAltitudeRef=${altRef} ${this._path}`
      const result = await cmd(command)
      result.exiftool_command = command
      debug('nemo: %o', result)
      return result
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Strip all location data from the image.
   * @summary Strip all location data from the image.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throws an error if no image is set yet.
   * @return { Object } Object literal with stdout or stderr.
   */
  async stripLocation() {
    if (!this._path) {
      throw new Error('No image file set yet.')
    }
    try {
      // const tags = '-overwrite_original -gps:all='
      // const tags = `${this._opts.overwrite_original} -gps:all= -XMP:LocationShown= -XMP:LocationCreated= -XMP:LocationShownCity= -XMP:LocationShownCountryCode= -XMP:LocationShownCountryName= `
      const tags = `${this._opts.overwrite_original} -gps:all= -XMP:LocationShown*= -XMP:LocationCreated*=  -XMP:Location= -XMP:City= -XMP:Country*= -IPTC:City= -IPTC:Province-State= -IPTC:Sub-location= -IPTC:Country*= `
      const command = `${this._executable} ${tags} ${this._path}`
      const result = await cmd(command)
      result.exiftool_command = command
      debug('stripLocation: %o', result)
      return result
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Find the path to the executable exiftool binary.
   * @summary Find the path to the executable exiftool binary.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { string|Error } Returns the file system path to exiftool binary, or throws an error.
   */
  async which() {
    if (this._executable !== null) {
      return this._executable
    }
    let which
    try {
      // test command not founc condition
      const exiftool = (!this?._test) ? 'exiftool' : 'exitfool'
      // which = await cmd('which exiftool')
      which = await cmd(`which ${exiftool}`)
      if (which.stdout.slice(-1) === '\n') {
        which = which.stdout.slice(0, -1)
        this._executable = which
        debug(`found: ${which}`)
      }
    } catch (e) {
      debug(e)
      throw new Error('Exiftool not found?', { cause: e })
    }
    return which
  }

  /** Get the version number of the currently installed exiftool.
   * @summary Get the version number of the currently installed exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @returns { string|Error } Returns the version of exiftool as a string, or throws an error.
   */
  async version() {
    if (this._version !== null) {
      return this._version
    }
    let ver
    const _exiftool = (this._executable !== null ? this._executable : await this.which())
    try {
      ver = await cmd(`${_exiftool} -ver`)
      if (ver.stdout.slice(-1) === '\n') {
        ver = ver.stdout.slice(0, -1)
        this._version = ver
        debug(`found: ${ver}`)
      }
    } catch (e) {
      debug(e)
      throw new Error('Exiftool not found?', { cause: e })
    }
    return ver
  }

  /**
   * Set the full command string from the options.
   * @summary Set the full command string from the options.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  setCommand() {
    debug('setCommand method entered')
    this._command = `${this._executable} ${this.getOptions()} ${this._path}`
  }

  /**
   * Lexically order the array of file extensions to be excluded from the exiftool query.
   * @summary Lexically order the array of file extensions to be excluded from the exiftool query.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return undefined
   */
  orderExcludeTypesArray() {
    this._extensionsToExclude.forEach((ext) => ext.toLowerCase())
    this._extensionsToExclude.sort((a, b) => {
      if (a.toLowerCase() < b.toLowerCase()) return -1
      if (a.toLowerCase() > b.toLowerCase()) return 1
      return 0
    })
    // this._extensionsToExclude = temp
  }

  /**
   * Compose the command line string of file type extentions for exiftool to exclude.
   * @summary Compose the command line string of file type extensions for exiftool to exclude.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  setExcludeTypes() {
    this._extensionsToExclude.forEach((ext) => { this._opts.excludeTypes += `--ext ${ext} ` })
  }

  /**
   * Get the instance property array of file type extentions for exiftool to exclude.
   * @summary Get the instance property array of file type extensions for exiftool to exclude.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @returns { Array<string> } The array of file type extentions for exiftool to exclude.
   */
  getExtensionsToExclude() {
    return this._extensionsToExclude
  }

  /**
   * Set the array of file type extentions that exiftool should ignore while recursing through a directory.
   * @summary Set the array of file type extenstions that exiftool should ignore while recursing through a directory.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @throws Will throw an error if extensionsArray is not an Array.
   * @param { Array<string> } extensionsToAddArray - An array of file type extensions to add to the exclude list.
   * @param { Array<string> } extensionsToRemoveArray - An array of file type extensions to remove from the exclude list.
   * @return { undefined }
   */
  setExtensionsToExclude(extensionsToAddArray = null, extensionsToRemoveArray = null) {
    // if (extensionsToAddArray !== '' || extensionsToAddArray !== null) {
    if (extensionsToAddArray !== null) {
      if (extensionsToAddArray.constructor !== Array) {
        throw new Error('Expecting an array of file extensions to be added.')
      }
      extensionsToAddArray.forEach((ext) => {
        if (!this._extensionsToExclude.includes(ext.toLowerCase())) {
          this._extensionsToExclude.push(ext.toLowerCase())
        }
      })
    }
    // if (extensionsToRemoveArray !== '' || extensionsToRemoveArray !== null) {
    if (extensionsToRemoveArray !== null) {
      if (extensionsToRemoveArray.constructor !== Array) {
        throw new Error('Expecting an array of file extensions to be removed.')
      }
      extensionsToRemoveArray.forEach((ext) => {
        const index = this._extensionsToExclude.indexOf(ext.toLowerCase())
        if (index > 0) {
          this._extensionsToExclude.splice(index, 1)
        }
      })
    }
    this.orderExcludeTypesArray()
    this._opts.excludeTypes = ''
    this.setExcludeTypes()
  }

  /**
   * Concatenate all the exiftool options together into a single string.
   * @summary Concatenate all the exiftool options together into a single string.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { string } Commandline options to exiftool.
   */
  getOptions() {
    debug('getOptions method entered')
    let tmp = ''
    if (this._opts.excludeTypes === '') {
      this.setExcludeTypes()
    }
    // return Object.values(this._opts).join(' ')
    Object.keys(this._opts).forEach((key) => {
      // debug(`checking _opts keys: _opts[${key}]: ${this._opts[key]}`)
      if (/overwrite_original/i.test(key)) {
        debug(`ignoring ${key}`)
        tmp += ''
      } else if (/tagList/i.test(key) && this._opts.tagList === null) {
        // debug(`ignoring ${key}`)
        tmp += ''
      } else {
        tmp += `${this._opts[key]} `
      }
    })
    // debug('option string: ', tmp)
    return tmp
  }

  /**
   * Set the file system path to a different exiftool.config to be used.
   * @summary Set the file system path to a different exiftool.config to be used.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } newConfigPath - A string containing the file system path to a valid exiftool.config file.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setConfigPath(newConfigPath) {
    debug('setConfigPath method entered')
    const o = { value: null, error: null }
    if (newConfigPath === '' || newConfigPath === null) {
      o.error = 'A valid file system path to an exiftool.config file is required.'
    } else {
      try {
        // const stats = await stat(newConfigPath)
        if (/^"/.test(newConfigPath)) {
          await stat(newConfigPath.slice(1, -1))
          this._exiftool_config = newConfigPath
        } else {
          await stat(newConfigPath)
          this._exiftool_config = `"${newConfigPath}"`
        }
        o.value = true
        this._opts.exiftool_config = `-config ${this._exiftool_config}`
        this.setCommand()
      } catch (e) {
        o.value = false
        o.error = e.message
        o.e = e
      }
    }
    return o
  }

  /**
   * Get the instance property for the file system path to the exiftool.config file.
   * @summary Get the instance property for the file system path to the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @returns { Object } Returns an object literal with success or error messages.
   */
  getConfigPath() {
    debug('getConfigPath method entered')
    const o = { value: null, error: null }
    if (this._exiftool_config === '' || this._exiftool_config === null || typeof this._exiftool_config === 'undefined') {
      o.error = 'No path set for the exiftool.config file.'
    } else if (/^"/.test(this._exiftool_config)) {
      o.value = this._exiftool_config.slice(1, -1)
    } else {
      o.value = this._exiftool_config
    }
    return o
  }

  /**
   * Check the exiftool.config to see if the specified shortcut exists.
   * @summary Check to see if a shortcut exists.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } shortcut - The name of a shortcut to check if it exists in the exiftool.config.
   * @return { boolean } Returns true if the shortcut exists in the exiftool.config, false if not.
   */
  async hasShortcut(shortcut) {
    debug('hasShortcut method entered')
    let exists
    if (shortcut === 'undefined' || shortcut === null) {
      exists = false
    } else {
      try {
        const re = new RegExp(`${shortcut}`, 'i')
        const grep = `grep -i "${shortcut}" ${this._exiftool_config}`
        const output = await cmd(grep)
        output.grep_command = grep
        debug('grep -i: %o', output)
        const stdout = output.stdout?.match(re)
        if (shortcut.toLowerCase() === stdout[0].toLowerCase()) {
          exists = true
        } else {
          exists = false
        }
      } catch (e) {
        debug(e)
        exists = false
      }
    }
    return exists
  }

  /**
   * Add a new shortcut to the exiftool.config file.
   * @summary Add a new shortcut to the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } newShortcut - The string of text representing the new shortcut to add to exiftool.config file.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async addShortcut(newShortcut) {
    debug('addShortcut method entered')
    const o = { value: null, error: null }
    if (newShortcut === 'undefined' || newShortcut === '') {
      o.error = 'Shortcut name must be provided as a string.'
    } else {
      try {
        let sedCommand
        if (process.platform === 'darwin') {
          /* eslint-disable-next-line no-useless-escape */
          sedCommand = `sed -i'.bk' -e '2i\\
              ${newShortcut},' ${this._exiftool_config}`
        } else {
          sedCommand = `sed -i.bk "2i\\    ${newShortcut}," ${this._exiftool_config}`
        }
        debug(`sed command: ${sedCommand}`)
        const output = await cmd(sedCommand)
        debug(output)
        o.command = sedCommand
        if (output.stderr === '') {
          o.value = true
        } else {
          o.value = false
          o.error = output.stderr
        }
      } catch (e) {
        debug(`Failed to add shortcut, ${newShortcut}, to exiftool.config file`)
        debug(e)
      }
    }
    return o
  }

  /**
   * Remove a shorcut from the exiftool.config file.
   * @summary Remove a shortcut from the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } shortcut - A string containing the name of the shortcut to remove.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async removeShortcut(shortcut) {
    debug('removeShortcut method entered')
    const o = { value: null, error: null }
    if (shortcut === 'undefined' || shortcut === '') {
      o.error = 'Shortcut name must be provided as a string.'
    } else {
      try {
        const sedCommand = `sed -i.bk "/${shortcut}/d" ${this._exiftool_config}`
        o.command = sedCommand
        debug(`sed command: ${sedCommand}`)
        const output = await cmd(sedCommand)
        debug(output)
        if (output.stderr === '') {
          o.value = true
        } else {
          o.value = false
          o.error = output.stderr
        }
      } catch (e) {
        debug(`Failed to remove shortcut, ${shortcut}, from the exiftool.config file.`)
        debug(e)
      }
    }
    return o
  }

  /**
   * Clear the currently set exiftool shortcut.  No shortcut means exiftool returns all tags.
   * @summary Clear the currently set exiftool shortcut.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  clearShortcut() {
    debug('clearShortcut method entered')
    this._opts.shortcut = ''
    this.setCommand()
  }

  /**
   * Set a specific exiftool shortcut.  The new shortcut must already exist in the exiftool.config file.
   * @summary Set a specific exiftool shortcut to use.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } shortcut - The name of a new exiftool shortcut to use.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setShortcut(shortcut) {
    debug('setShortcut method entered')
    const o = { value: null, error: null }
    if (shortcut === undefined || shortcut === null) {
      o.error = 'Shortcut must be a string value.'
    } else {
      this._opts.shortcut = `-${shortcut}`
      this.setCommand()
      o.value = true
    }
    return o
  }

  /**
   * Set one or more explicit metadata tags in the command string for exiftool to extract.
   * @summary Set one or more explicit metadata tags in the command string for exiftool to extract.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { (string|Array) } tagsToExtract - A string or an array of metadata tags to be passed to exiftool.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setMetadataTags(tagsToExtract) {
    debug('setMetadataTags method entered')
    let tags
    debug(`>> ${tagsToExtract}`)
    const o = { value: null, error: null }
    if (tagsToExtract === 'undefined' || tagsToExtract === '' || tagsToExtract === null) {
      o.error = 'One or more metadata tags are required'
    } else {
      if (Array === tagsToExtract.constructor) {
        debug('array of tags')
        // check array elements so they all have '-' prefix
        tags = tagsToExtract.map((tag) => {
          if (!/^-{1,1}[^-]?.+$/.test(tag)) {
            return `-${tag}`
          }
          return tag
        })
        debug(tags)
        // join array elements in to a string
        this._opts.tagList = `${tags.join(' ')}`
      }
      if (String === tagsToExtract.constructor) {
        debug('string of tags')
        if (tagsToExtract.match(/^-/) === null) {
          this._opts.tagList = `-${tagsToExtract}`
        }
        this._opts.tagList = tagsToExtract
      }
      debug(this._opts.tagList)
      debug(this._command)
      this.setCommand()
      o.value = true
    }
    return o
  }

  /**
   * Run the composed exiftool command to get the requested exif metadata.
   * @summary Get the exif metadata for one or more image files.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Will throw an error if -all= tag is included in the tagsToExtract parameter.
   * @throws Will throw an error if exiftool returns a fatal error via stderr.
   * @param { string } [ fileOrDir=null ] - The string path to a file or directory for exiftool to use.
   * @param { string } [ shortcut=''] - A string containing the name of an existing shortcut for exiftool to use.
   * @param { string } [ tagsToExtract=null ] - A string of one or more metadata tags to pass to exiftool.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async getMetadata(fileOrDir = null, shortcut = '', ...tagsToExtract) {
    debug('getMetadata method entered')
    if (fileOrDir !== null && fileOrDir !== '') {
      this.setPath(fileOrDir)
    }
    debug(`shortcut: ${shortcut}`)
    // if (shortcut !== null && shortcut !== '') {
    if (shortcut !== null && shortcut !== '' && shortcut !== false) {
      this.setShortcut(shortcut)
    } else if (shortcut === null || shortcut === false) {
      this.clearShortcut()
    } else {
      // leave default BasicShortcut in place
      // this.clearShortcut()
      debug(`leaving any currenly set shortcut in place: ${this._opts.shortcut}`)
    }
    if (tagsToExtract.length > 0) {
      if (tagsToExtract.includes('-all= ')) {
        debug("Can't include metadata stripping -all= tag in get metadata request.")
        throw new Error("Can't include metadata stripping -all= tag in get metadata reqeust.")
      }
      const options = this.setMetadataTags(tagsToExtract.flat())
      debug(options)
      debug(this._opts)
      if (options.error) {
        throw new Error('tag list option failed')
      }
    }
    debug(this._command)
    try {
      let count
      let metadata = await cmd(this._command)
      if (metadata.stderr !== '') {
        throw new Error(metadata.stderr)
      }
      const match = this._opts.outputFormat.match(/(?<format>xml.*|json)/i)
      if (match && match.groups.format === 'json') {
        metadata = JSON.parse(metadata.stdout)
        count = metadata.length
        metadata.push({ exiftool_command: this._command })
        metadata.push({ format: 'json' })
        metadata.push(count)
      } else if (match && match.groups.format === 'xmlFormat') {
        const tmp = []
        const parser = new fxp.XMLParser()
        const xml = parser.parse(metadata.stdout)
        debug(xml)
        tmp.push(xml)
        tmp.push({ raw: metadata.stdout })
        tmp.push({ format: 'xml' })
        tmp.push({ exiftool_command: this._command })
        tmp.push(count)
        metadata = tmp
      } else {
        metadata = metadata.stdout
      }
      debug(metadata)
      return metadata
    } catch (e) {
      debug(e)
      e.exiftool_command = this._command
      return e
    }
  }

  /**
   * Extract the raw XMP data as xmp-rdf packet.
   * @summary Extract the raw XMP data as xmp-rdf packet.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Will throw an error if exiftool returns a fatal error via stderr.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async getXmpPacket() {
    debug('getXmpPacket method entered.')
    try {
      const command = `${this._executable} ${this._opts.exiftool_config} -xmp -b ${this._path}`
      const packet = await cmd(command)
      if (packet.stderr !== '') {
        throw new Error(packet.stderr)
      }
      packet.exiftool_command = command
      // const parser = new fxp.XMLParser()
      // const builder = new fxp.XMLBuilder()
      // packet.xmp = builder.build(parser.parse(packet.stdout))
      packet.xmp = packet.stdout
      delete packet.stdout
      delete packet.stderr
      return packet
    } catch (e) {
      debug(e)
      e.exiftool_command = this._command
      return e
    }
  }

  /**
   * Write a new metadata value to the designated tags.
   * @summary Write a new metadata value to the designated tags.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Throws an error if there is no valid path to an image file.
   * @throws Throws an error if the current path is to a directory instead of a file.
   * @throws Throws an error if the expected parameter is missing or of the wrong type.
   * @throws Throws an error if exiftool returns a fatal error via stderr.
   * @param { string|Array<string> } metadataToWrite - A string value with tag name and new value or an array of tag strings.
   * @return { Object|Error } Returns an object literal with success or error messages, or throws an exception if no image given.
   */
  async writeMetadataToTag(metadataToWrite) {
    debug('writeMetadataToTag method entered')
    const o = { value: null, error: null }
    let tagString = ''
    if (this._path === null) {
      throw new Error('No image was specified to write new metadata content to.')
    }
    if (this._isDirectory) {
      throw new Error('A directory was given.  Use a path to a specific file instead.')
    }
    switch (metadataToWrite.constructor) {
      case Array:
        tagString = metadataToWrite.join(' ')
        break
      case String:
        tagString = metadataToWrite
        break
      default:
        throw new Error(`Expected a string or an array of strings.  Received: ${metadataToWrite.constructor}`)
    }
    try {
      debug(`tagString: ${tagString}`)
      const file = `${this._path}`
      // const write = `${this._executable} ${this._opts.exiftool_config} ${tagString} ${file}`
      const write = `${this._executable} ${this._opts.exiftool_config} ${this._opts.overwrite_original} ${tagString} ${file}`
      o.command = write
      const result = await cmd(write)
      if (result.stdout.trim() === null) {
        throw new Error(`Failed to write new metadata to image - ${file}`)
      }
      o.value = true
      o.stdout = result.stdout.trim()
    } catch (e) {
      debug(e)
      o.error = e
    }
    return o
  }

  /**
   * Clear the metadata from a tag, but keep the tag rather than stripping it from the image file.
   * @summary Clear the metadata from a tag, but keep the tag rather than stripping it from the image file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Throws an error if there is no valid path to an image file.
   * @throws Throws an error if the current path is to a directory instead of a file.
   * @throws Throws an error if the expected parameter is missing or of the wrong type.
   * @throws Throws an error if exiftool returns a fatal error via stderr.
   * @param { string|Array<string> } tagsToClear - A string value with tag name or an array of tag names.
   * @return { Object|Error } Returns an object literal with success or error messages, or throws an exception if no image given.
   */
  async clearMetadataFromTag(tagsToClear) {
    debug('clearMetadataFromTag method entered')
    const o = { value: null, errors: null }
    let tagString = ''
    if (this._path === null) {
      throw new Error('No image was specified to clear metadata from tags.')
    }
    if (this._isDirectory) {
      throw new Error('No image was specified to write new metadata content to.')
    }
    switch (tagsToClear.constructor) {
      case Array:
        tagString = tagsToClear.join(' ')
        break
      case String:
        tagString = tagsToClear
        break
      default:
        throw new Error(`Expected a string or an arrray of strings.  Recieved ${tagsToClear.constructor}`)
    }
    try {
      debug(`tagString: ${tagString}`)
      const file = `${this._path}`
      const clear = `${this._executable} ${tagString} ${file}`
      o.command = clear
      const result = await cmd(clear)
      if (result.stdout.trim() === null) {
        throw new Error(`Failed to clear the tags: ${tagString}, from ${file}`)
      }
      o.value = true
      o.stdout = result.stdout.trim()
    } catch (e) {
      debug(e)
      o.error = e
    }
    return o
  }

  /**
   * Run the composed exiftool command to strip all the metadata from a file, keeping a backup copy of the original file.
   * @summary Run the composed exiftool command to strip all the metadata from a file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Will throw an error if instance property _path is missing.
   * @throws Will throw an error if instance property _isDirectory is true.
   * @throws Will throw an error if exiftool returns a fatal error via stderr.
   * @return { (Object|Error) } Returns a JSON object literal with success message or throws an Error if failed.
   */
  async stripMetadata() {
    debug('stripMetadata method entered')
    const o = { value: null, error: null }
    if (this._path === null) {
      throw new Error('No image was specified to strip all metadata from.')
    }
    if (this._isDirectory) {
      throw new Error('A directory was given.  Use a path to a specific file instead.')
    }
    // exiftool -all= -o %f_copy%-.4nc.%e copper.jpg
    const file = `${this._path}`
    const strip = `${this._executable} -config ${this._exiftool_config} ${this._opts.overwrite_original} -all= ${file}`
    o.command = strip
    try {
      const result = await cmd(strip)
      debug(result)
      if (result.stdout.trim().match(/files updated/) === null) {
        throw new Error(`Failed to strip metadata from image - ${file}.`)
      }
      o.value = true
      if (!this._opts.overwrite_original) {
        o.original = `${file}_original`
      }
    } catch (e) {
      o.value = false
      o.error = e
      debug(o)
    }
    return o
  }

  /**
   * This method takes a single string parameter which is a fully composed metadata query to be passed directly to exiftool.
   * @summary This method takes a single string parameter which is a fully composed metadata query to be passed directly to exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws Will throw an error if the single string parameter is not provided.
   * @throws Will throw an error if the exiftool command returns a fatal error via stderr.
   * @param { string } query - A fully composed metadata to be passed directly to exiftool.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async raw(query) {
    debug('raw method entered')
    if (query === '' || typeof query === 'undefined' || query.constructor !== String) {
      throw new Error('No query was provided for exiftool to execute.')
    }
    let command = ''
    const match = query.match(/(^[/?].*exiftool\s)/)
    if (!match) {
      if (this._executable === null) {
        throw new Error('No path to exiftool executable provided.  Include exiftool path in query.')
      }
      command = this._executable
    }
    command += ` ${query}`
    try {
      let result = await cmd(command)
      // if (result.stderr !== '') {
      //   const cause = new Error(result.stderr)
      //   throw new Error(`exiftool failed to exectue query: ${query}`, { cause })
      // }
      // result = JSON.parse(result.stdout.trim())
      // result.push({ exiftool_command: command })
      const tmp = JSON.parse(result.stdout.trim())
      const tmperr = result.stderr
      result = tmp
      result.push({ exiftool_command: command })
      result.push({ stderr: tmperr })
      debug(result)
      return result
    } catch (e) {
      e.exiftool_command = command
      debug(e)
      return e
    }
  }
}
