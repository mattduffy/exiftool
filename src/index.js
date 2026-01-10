/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary The Exiftool class definition file.
 * @file src/index.js
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import {
  exec,
  spawn,
} from 'node:child_process'
import Debug from 'debug'
import * as fxp from 'fast-xml-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cmd = promisify(exec)
Debug.log = console.log.bind(console)
const debug = Debug('exiftool')
const error = debug.extend('ERROR')
const info = debug.extend('INFO')
info.info = console.info.bind(console)

/**
 * A class wrapping the exiftool metadata tool.
 * @summary A class wrapping the exiftool image metadata extraction tool.
 * @class Exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */
export class Exiftool {
  /**
   * Create an instance of the exiftool wrapper.
   * @param { string } imagePath - String value of file path to an image file or directory
   *                               of images.
   * @param { Boolean } [test] - Set to true to test outcome of exiftool command not found.
   */
  constructor(imagePath, test) {
    const log = debug.extend('constructor')
    log('constructor method entered')
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
    this._MAX_BUFFER_MULTIPLIER = 10
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
   * @param { String } imagePath - A file system path to set for exiftool to process.
   * @return { (Exiftool|Boolean) } Returns fully initialized instance or false.
   */
  async init(imagePath) {
    const log = debug.extend('init')
    const err = error.extend('init')
    log('init method entered')
    try {
      if (this._executable === null) {
        this._executable = await this.which()
        this._version = await this.version()
      }
      log('setting the command string')
      this.setCommand()
    } catch (e) {
      err('could not find exiftool command')
      // err(e)
      throw new Error(
        'ATTENTION!!! '
        + 'exiftool IS NOT INSTALLED.  '
        + 'You can get exiftool at https://exiftool.org/install.html',
        { cause: e },
      )
    }
    if ((imagePath === '' || typeof imagePath === 'undefined') && this._path === null) {
      err('Param: path - was undefined.')
      err(`Instance property: path - ${this._path}`)
      return false
    }
    try {
      await this.setPath(imagePath)
    } catch (e) {
      err(e)
      throw e
    }
    try {
      log('checking if config file exists.')
      if (await this.hasExiftoolConfigFile()) {
        log('exiftool.config file exists')
      } else {
        log('missing exiftool.config file')
        log('attempting to create basic exiftool.config file')
        const result = this.createExiftoolConfigFile()
        if (!result.value && result.error) {
          err('failed to create new exiftool.config file')
          throw new Error(result.error)
        }
        log('new exiftool.config file created')
      }
    } catch (e) {
      err('could not create exiftool.config file')
      err(e)
    }
    return this
  }

  /**
   * Run the exiftool command in node's child_process.spawn() method.
   * @summary Use child_process.spawn() method instead of child_process.exec().
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { object }
   */
  async cmd() {
    const log = debug.extend('cmd')
    const err = error.extend('cmd')
    log(this._executable)
    log(this._opts)
    log(this._path)
    const args = this.getOptionsAsArray()
    args.push(this._path)
    const config = {
      shell: true,
    }
    const metadata = new Promise((resolve, reject) => {
      const output = {
        stdout: '',
        stderr: '',
      }
      const process = spawn(this._executable, args, config)

      process.stdout.on('data', (data) => {
        output.stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        output.stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          if (this._opts.outputFormat === '-json') {
            output.stdout = JSON.parse(output.stdout)
          }
          resolve(output)
        } else {
          // error(process)
          output.stderr = JSON.parse(output.stderr)
          error(new Error(`Process exited with code ${code}: ${output.stderr}`))
          reject(output)
        }
      })

      process.on('error', (e) => {
        err('spawn error', e)
        // if (output.stdout !== '') {
        //   output.stdout = JSON.parse(output.stdout)
        // }
        // if (output.stderr !== '') {
        //   output.stderr = JSON.parse(output.stderr)
        // }
        reject(JSON.parse(e))
      })
    })
    return metadata
  }

  /**
   * Set the maxBuffer size for stdio to support larger image files.
   * @summary Set the maxBuffer size for stdio to support larger image files.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @deprecated since 1.17.0.
   * @param { Number } multiplier - Value to multiply the default (1024x1024) setting.
   * @return { undefined }
   */
  setMaxBufferMultiplier(multiplier) {
    const log = debug.extend('setMaxBufferMultiplier')
    const deprecated = info.extend('Deprecated')
    let _multiplier
    deprecated('Attention! The Exiftool.setMaxBufferMultiplier() method is now deprecated.')
    deprecated('Calling this method has not affect on metadata extraction commands.')
    if (multiplier === Infinity || multiplier === undefined) {
      _multiplier = Infinity
    } else {
      _multiplier = Number.parseInt(multiplier, 10)
    }
    if (_multiplier) {
      const orig = (1024 * 1024) * this._MAX_BUFFER_MULTIPLIER
      this._MAX_BUFFER_MULTIPLIER = _multiplier
      const now = (1024 * 1024) * this._MAX_BUFFER_MULTIPLIER
      log(`setting stdio maxBuffer ${orig} to ${now}`)
    }
  }

  /**
   * Get the size of the memory buffer that will be allocated to exec().
   * @summary Get the size of the memory buffer that will be allocated to exec().
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @deprecated since 1.17.0.
   * @return { String }
   */
  getOutputBufferSize() {
    const deprecated = info.extend('Deprecated')
    deprecated('Attention! Adjusting maxBuffer size has been deprecated.')
    deprecated('Using setMaxBufferMultiplier() has no affect.')
    return `${this._MAX_BUFFER_MULTIPLIER * (1024 * 1024)} Bytes`
  }

  /**
   * Set ExifTool to overwrite the original image file when writing new tag data.
   * @summary Set ExifTool to overwrite the original image file when writing new tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { Boolean } enabled - True/False value to enable/disable overwriting the original
   *                              image file.
   * @return { undefined }
   */
  setOverwriteOriginal(enabled) {
    const log = debug.extend('setOverwriteOriginal')
    if (enabled) {
      log('setting -overwrite_original option')
      this._opts.overwrite_original = '-overwrite_original'
    } else {
      this._opts.overwrite_original = ''
    }
  }

  /**
   * Set ExifTool to extract binary tag data.
   * @summary Set ExifTool to extract binary tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { Boolean } enabled - True/False value to enable/disable binary tag extraction.
   * @return { undefined }
   */
  enableBinaryTagOutput(enabled) {
    const log = debug.extend('enableBinaryTagOutput')
    if (enabled) {
      log('Enabling binary output.')
      this._opts.binaryFormat = '-binary'
    } else {
      log('Disabling binary output.')
      this._opts.binaryFormat = ''
    }
    this.setCommand()
  }

  /**
   * Set ExifTool output format.
   * @summary Set Exiftool output format.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { String } [fmt='json'] - Output format to set, default is JSON, but can be XML.
   * @return { Boolean } - Return True if new format is set, False otherwise.
   */
  setOutputFormat(fmt = 'json') {
    const log = debug.extend('setOutputFormat')
    const err = error.extend('setOutputFormat')
    let newFormat
    const match = fmt.match(/(?<format>xml|json)/i)
    if (match || match.groups?.format) {
      newFormat = (match.groups.format === 'xml') ? '-xmlFormat' : '-json'
      this._opts.outputFormat = newFormat
      log(`Output format is set to ${this._opts.outputFormat}`)
      this.setCommand()
      return true
    }
    err(`Output format ${fmt} not supported.`)
    return false
  }

  /**
   * Set ExifTool output formatting for GPS coordinate data.
   * @summary Set ExifTool output formatting for GPS coordinate data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { String } [fmt=default] - Printf format string with specifiers for degrees,
   *                                   minutes and seconds.
   * @see {@link https://exiftool.org/exiftool_pod.html#c-FMT--coordFormat}
   * @return { undefined }
   */
  setGPSCoordinatesOutputFormat(fmt = 'default') {
    const log = debug.extend('setGPSCoordinatesOutputFormat')
    const groups = fmt.match(/(?<signed>\+)?(?<gps>gps)/i)?.groups
    if (fmt.toLowerCase() === 'default') {
      // revert to default formatting
      this._opts.coordFormat = ''
    } else if (groups?.gps === 'gps') {
      this._opts.coordFormat = `-coordFormat %${(groups?.signed ? '+' : '')}.6f`
    } else {
      this._opts.coordFormat = `-coordFormat ${fmt}`
    }
    log(`GPS format is now ${fmt}`)
  }

  /**
   * Set ExifTool to extract xmp struct tag data.
   * @summary Set ExifTool to extract xmp struct tag data.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { Boolean } enabled - True/False value to enable/disable xmp struct tag extraction.
   * @return { undefined }
   */
  enableXMPStructTagOutput(enabled) {
    const log = debug.extend('enableXMPStructTagOutput')
    if (enabled) {
      log('Enabling XMP struct output format.')
      this._opts.structFormat = '-struct'
    } else {
      log('Disabling XMP struct output format.')
      this._opts.structFormat = ''
    }
  }

  /**
   * Tell exiftool to use the Metadata Working Group (MWG) module for overlapping EXIF, IPTC,
   * and XMP tqgs.
   * @summary Tell exiftool to use the MWG module for overlapping tag groups.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { Boolean } - True/false value to enable/disable mwg module.
   * @return { undefined }
   */
  useMWG(enabled) {
    const log = debug.extend('useMWG')
    if (enabled) {
      log('Enabling MWG.')
      this._opts.useMWG = '-use MWG'
    } else {
      log('Disabling MWG.')
      this._opts.useMGW = ''
    }
  }

  /**
   * Set the path for image file or directory of images to process with exiftool.
   * @summary Set the path of image file or directory of images to process with exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String } imagePath - A file system path to set for exiftool to process.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setPath(imagePath) {
    const log = debug.extend('setPath')
    const err = error.extend('setPath')
    log('setPath method entered')
    const o = { value: null, error: null }
    if (typeof imagePath === 'undefined' || imagePath === null) {
      o.error = 'A path to image or directory is required.'
      err(o.error)
      return o
    }
    let pathToImage
    if (Array.isArray(imagePath)) {
      let temp = imagePath.map((i) => `"${path.resolve('.', i)}"`)
      temp = temp.join(' ')
      log(
        'imagePath passed as an Array.  Resolving and concatting the paths into a single '
        + `string: ${temp}`,
      )
      pathToImage = temp
    } else {
      pathToImage = `"${path.resolve('.', imagePath)}"`
    }
    if (!/^(")?\//.test(pathToImage)) {
      // the path parameter must be a fully qualified file path, starting with /
      throw new Error(
        'The file system path to image must be a fully qualified path, starting from root /.',
      )
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
      err(e)
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
    const log = debug.extend('getPath')
    const err = error.extend('getPath')
    log('getPath method entered')
    const o = { value: null, error: null }
    if (this._path === null || typeof this._path === 'undefined' || this._path === '') {
      o.error = 'Path to an image file or image directory is not set.'
      err(o.error)
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
   * @return { Boolean } Returns True if present, False if not.
   */
  async hasExiftoolConfigFile() {
    const log = debug.extend('hasExiftoolConfigFile')
    const err = error.extend('hasExiftoolConfigFile')
    log('hasExiftoolConfigFile method entered')
    log('>')
    let exists = false
    const file = this._exiftool_config
    let stats
    try {
      log('>>')
      if (/^"/.test(file)) {
        stats = await stat(file.slice(1, -1))
      } else {
        stats = await stat(file)
      }
      log('>>>')
      log(stats)
      exists = true
    } catch (e) {
      err('>>>>')
      err(e)
      exists = false
    }
    log('>>>>>')
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
    const log = debug.extend('createExiftoolConfigFile')
    const err = error.extend('createExiftoolConfigFile')
    log('createExiftoolConfigFile method entered')
    const o = { value: null, error: null }
    /* eslint-disable max-len */
    const stub = `%Image::ExifTool::UserDefined::Shortcuts = (
    BasicShortcut => ['file:Directory','file:FileName','EXIF:CreateDate','file:MIMEType','exif:Make','exif:Model','exif:ImageDescription','iptc:ObjectName','iptc:Caption-Abstract','iptc:Keywords','Composite:GPSPosition'],
    Location => ['EXIF:GPSLatitudeRef', 'EXIF:GPSLatitude', 'EXIF:GPSLongitudeRef', 'EXIF:GPSLongitude', 'EXIF:GPSAltitudeRef', 
    'EXIF:GPSSpeedRef', 'EXIF:GPSAltitude', 'EXIF:GPSSpeed', 'EXIF:GPSImgDirectionRef', 'EXIF:GPSImgDirection', 'EXIF:GPSDestBearingRef', 'EXIF:GPSDestBearing', 
    'EXIF:GPSHPositioningError', 'Composite:GPSAltitude', 'Composite:GPSLatitude', 'Composite:GPSLongitude', 'Composite:GPSPosition', 'XMP:Location*', 'XMP:LocationCreatedGPSLatitude',
  'XMP:LocationCreatedGPSLongitude', 'XMP:LocationShownGPSLatitude', 'XMP:LocationShownGPSLongitude'],
    StripGPS => ['gps:all='],
);`
    /* eslint-enable max-len */
    // let fileName = `${this._cwd}/exiftool.config`
    const fileName = this._exiftool_config
    const echo = `echo "${stub}" > ${fileName}`
    try {
      log('attemtping to create exiftool.config file')
      const result = await cmd(echo)
      log(result.stdout)
      o.value = true
    } catch (e) {
      err('failed to create new exiftool.config file')
      err(e)
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
   * @param { String } [coordinates.state] - State name to be assigned using MWG composite
   *                                         method.
   * @param { String } [coordindates.country] - Country name to be assigned using MWG composite
   *                                            method.
   * @param { String } [coordindates.countryCode] - Country code to be assigned using MWG
   *                                                composite method.
   * @param { String } [coordinates.location] - Location name to be assigned using MWG composite
   *                                            method.
   * @throws { Error } Throws an error if no image is set yet.
   * @return { Object } Object literal with stdout or stderr.
   */
  async setLocation(coordinates) {
    const log = debug.extend('setLocation')
    const err = error.extend('setLocation')
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
        command += `-GPSLatitude=${lat} -GPSLatitudeRef=${latRef} -GPSLongitude=${lon} `
          + `-GPSLongitudeRef=${lonRef} -GPSAltitude=${alt} -GPSAltitudeRef=${altRef} `
          + `-XMP:LocationShownGPSLatitude=${lat} -XMP:LocationShownGPSLongitude=${lon}`
      }
      if (coordinates?.city !== undefined) {
        command += ` -IPTC:City='${coordinates.city}' `
          + `-XMP-iptcExt:LocationShownCity='${coordinates.city}' `
          + `-XMP:City='${coordinates.city}'`
        // command += ` -MWG:City='${coordinates.city}'`
      }
      if (coordinates?.state !== undefined) {
        command += ` -IPTC:Province-State='${coordinates.state}' `
          + `-XMP-iptcExt:LocationShownProvinceState='${coordinates.state}' `
          + `-XMP:Country='${coordinates.state}'`
        // command += ` -MWG:State='${coordinates.state}'`
      }
      if (coordinates?.country !== undefined) {
        command += ` -IPTC:Country-PrimaryLocationName='${coordinates.country}' `
          + '-XMP:LocationShownCountryName= '
          + `-XMP:LocationShownCountryName='${coordinates.country}' `
          + `-XMP:Country='${coordinates.country}'`
        // command += ` -MWG:Country='${coordinates.country}'`
      }
      if (coordinates?.countryCode !== undefined) {
        command += ` -IPTC:Country-PrimaryLocationCode='${coordinates.countryCode}' `
          + '-XMP:LocationShownCountryCode= '
          + `-XMP:LocationShownCountryCode='${coordinates.countryCode}' `
          + `-XMP:CountryCode='${coordinates.countryCode}'`
        // command += ` -MWG:Country='${coordinates.country}'`
      }
      if (coordinates?.location !== undefined) {
        command += ` -IPTC:Sub-location='${coordinates.location}' `
          + `-XMP-iptcExt:LocationShownSublocation='${coordinates.location}' `
          + `-XMP:Location='${coordinates.location}'`
        // command += ` -MWG:Location='${coordinates.location}'`
      }
      command += ` -struct -codedcharacterset=utf8 ${this._path}`
      log(command)
      // const result = await cmd(command)
      const result = await this.cmd(command)
      result.exiftool_command = command
      log('set new location: %o', result)
      return result
    } catch (e) {
      err(e)
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
    const log = debug.extend('nullIsland')
    const err = error.extend('nullIsland')
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
      const command = `${this._executable} -GPSLatitude=${latitude} `
        + `-GPSLatitudeRef=${latRef} -GPSLongitude=${longitude} -GPSLongitudeRef=${longRef} `
        + `-GPSAltitude=${alt} -GPSAltitudeRef=${altRef} ${this._path}`
      // const result = await cmd(command)
      const result = await this.cmd(command)
      result.exiftool_command = command
      log('null island: %o', result)
      return result
    } catch (e) {
      err(e)
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
    const log = debug.extend('nemo')
    const err = error.extend('nemo')
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
      const command = `${this._executable} -GPSLatitude=${latitude} -GPSLatitudeRef=${latRef} `
        + `-GPSLongitude=${longitude} -GPSLongitudeRef=${longRef} -GPSAltitude=${alt} `
        + `-GPSAltitudeRef=${altRef} ${this._path}`
      // const result = await cmd(command)
      const result = await this.cmd(command)
      result.exiftool_command = command
      log('nemo: %o', result)
      return result
    } catch (e) {
      err(e)
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
    const log = debug.extend('stripLocation')
    const err = error.extend('stripLocation')
    if (!this._path) {
      const msg = 'No image file set yet.'
      err(msg)
      throw new Error(msg)
    }
    try {
      const tags = `${this._opts.overwrite_original} -gps:all= -XMP:LocationShown*= `
        + '-XMP:LocationCreated*=  -XMP:Location= -XMP:City= -XMP:Country*= -IPTC:City= '
        + '-IPTC:Province-State= -IPTC:Sub-location= -IPTC:Country*= '
      const command = `${this._executable} ${tags} ${this._path}`
      // const result = await cmd(command)
      const result = await this.cmd(command)
      result.exiftool_command = command
      log('stripLocation: %o', result)
      return result
    } catch (e) {
      err(e)
      throw new Error(e)
    }
  }

  /**
   * Find the path to the executable exiftool binary.
   * @summary Find the path to the executable exiftool binary.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { String|Error } Returns the file system path to exiftool binary, or throws an
   *                          error.
   */
  async which() {
    const log = debug.extend('which')
    const err = error.extend('which')
    if (this._executable !== null) {
      return this._executable
    }
    let which
    try {
      // test command not founc condition
      const exiftool = (!this?._test) ? 'exiftool' : 'exitfool'
      which = await cmd(`which ${exiftool}`)
      if (which.stdout.slice(-1) === '\n') {
        which = which.stdout.slice(0, -1)
        this._executable = which
        log(`found: ${which}`)
      }
    } catch (e) {
      err(e)
      throw new Error('Exiftool not found?', { cause: e })
    }
    return which
  }

  /** Get the version number of the currently installed exiftool.
   * @summary Get the version number of the currently installed exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @returns { String|Error } Returns the version of exiftool as a string, or throws an error.
   */
  async version() {
    const log = debug.extend('version')
    const err = error.extend('version')
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
        log(`found: ${ver}`)
      }
    } catch (e) {
      err(e)
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
    const log = debug.extend('setCommand')
    this._command = `${this._executable} ${this.getOptions()} ${this._path}`
    log(`exif command set: ${this._command}`)
  }

  /**
   * Lexically order the array of file extensions to be excluded from the exiftool query.
   * @summary Lexically order the array of file extensions to be excluded from the exiftool
   *          query.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  orderExcludeTypesArray() {
    const log = debug.extend('orderExcludeTypesArray')
    this._extensionsToExclude.forEach((ext) => ext.toLowerCase())
    this._extensionsToExclude.sort((a, b) => {
      if (a.toLowerCase() < b.toLowerCase()) return -1
      if (a.toLowerCase() > b.toLowerCase()) return 1
      return 0
    })
    log(this._extensionsToExclude)
    // this._extensionsToExclude = temp
  }

  /**
   * Compose the command line string of file type extentions for exiftool to exclude.
   * @summary Compose the command line string of file type extensions for exiftool to exclude.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  setExcludeTypes() {
    const log = debug.extend('setExcludeTypes')
    this._extensionsToExclude.forEach((ext) => { this._opts.excludeTypes += `--ext ${ext} ` })
    log(this._extensionsToExclude)
  }

  /**
   * Get the instance property array of file type extentions for exiftool to exclude.
   * @summary Get the instance property array of file type extensions for exiftool to exclude.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @returns { String[] } The array of file type extentions for exiftool to exclude.
   */
  getExtensionsToExclude() {
    return this._extensionsToExclude
  }

  /**
   * Set the array of file type extentions that exiftool should ignore while recursing through
   * a directory.
   * @summary Set the array of file type extenstions that exiftool should ignore while
   *          recursing through a directory.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @throws Will throw an error if extensionsArray is not an Array.
   * @param { String[] } extensionsToAddArray - An array of file type extensions to add to the
   *                                            exclude list.
   * @param { String[] } extensionsToRemoveArray - An array of file type extensions to remove
   *                                               from the exclude list.
   * @return { undefined }
   */
  setExtensionsToExclude(extensionsToAddArray = null, extensionsToRemoveArray = null) {
    const log = debug.extend('setExtensiosToExclude')
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
    log(this._opts.excludeTypes)
  }

  /**
   * Concatenate all the exiftool options together into a single string.
   * @summary Concatenate all the exiftool options together into a single string.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { String } Commandline options to exiftool.
   */
  getOptions() {
    const log = debug.extend('getOptions')
    let tmp = ''
    if (this._opts.excludeTypes === '') {
      this.setExcludeTypes()
    }
    Object.keys(this._opts).forEach((key) => {
      if (/overwrite_original/i.test(key)) {
        log(`ignoring ${key}`)
        log('well, not really for now.')
        tmp += `${this._opts[key]} `
      } else if (/tagList/i.test(key) && this._opts.tagList === null) {
        // log(`ignoring ${key}`)
        tmp += ''
      } else {
        tmp += `${this._opts[key]} `
      }
    })
    log('options string: ', tmp)
    return tmp
  }

  /**
   * Concatenate all the exiftool options together into a String[].
   * @summary Concatenate all the exiftool options together into a String[].
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { String[] } Array of commandline options to exiftool.
   */
  getOptionsAsArray() {
    const log = debug.extend('getOptionsAsArray')
    const tmp = []
    if (this._opts.excludeTypes === '') {
      this.setExcludeTypes()
    }
    Object.keys(this._opts).forEach((key) => {
      if (/overwrite_original/i.test(key)) {
        log(`ignoring ${this._opts[key]}`)
        // tmp.push(this._opts[key])
      } else if (/tagList/i.test(key) && this._opts.tagList === null) {
        log(`ignoring ${this._opts[key]}`)
      } else if (this._opts[key] === '') {
        log(`ignoring empty ${this._opts[key]}`)
      } else {
        tmp.push(this._opts[key])
      }
    })
    log('options array: ', tmp)
    return tmp
  }

  /**
   * Set the file system path to a different exiftool.config to be used.
   * @summary Set the file system path to a different exiftool.config to be used.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String } newConfigPath - A string containing the file system path to a valid
   *                                   exiftool.config file.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setConfigPath(newConfigPath) {
    const log = debug.extend('setConfigPath')
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
    log(`Config path set to: ${this._exiftool_config}`)
    return o
  }

  /**
   * Get the instance property for the file system path to the exiftool.config file.
   * @summary Get the instance property for the file system path to the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @returns { Object } Returns an object literal with success or error messages.
   */
  getConfigPath() {
    const log = debug.extend('getConfigPath')
    log('getConfigPath method entered')
    const o = { value: null, error: null }
    if (this._exiftool_config === ''
      || this._exiftool_config === null
      || typeof this._exiftool_config === 'undefined') {
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
   * @param { String } shortcut - The name of a shortcut to check if it exists in the
   *                              exiftool.config.
   * @return { Boolean } Returns true if the shortcut exists in the exiftool.config, false if
   *                     not.
   */
  async hasShortcut(shortcut) {
    const log = debug.extend('hasShortcut')
    const err = error.extend('hasShortcut')
    let exists
    if (shortcut === 'undefined' || shortcut === null) {
      exists = false
    } else {
      try {
        const re = new RegExp(`${shortcut}`, 'i')
        const grep = `grep -i "${shortcut}" ${this._exiftool_config}`
        const output = await cmd(grep)
        output.grep_command = grep
        log('grep -i: %o', output)
        const stdout = output.stdout?.match(re)
        if (shortcut.toLowerCase() === stdout[0].toLowerCase()) {
          exists = true
        } else {
          exists = false
        }
      } catch (e) {
        err(e)
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
   * @param { String } newShortcut - The string of text representing the new shortcut to add
   *                                 to exiftool.config file.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async addShortcut(newShortcut) {
    const log = debug.extend('addShortcut')
    const err = error.extend('addShortcut')
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
        log(`sed command: ${sedCommand}`)
        const output = await cmd(sedCommand)
        log(output)
        o.command = sedCommand
        if (output.stderr === '') {
          o.value = true
        } else {
          o.value = false
          o.error = output.stderr
        }
      } catch (e) {
        err(`Failed to add shortcut, ${newShortcut}, to exiftool.config file`)
        err(e)
      }
    }
    return o
  }

  /**
   * Remove a shorcut from the exiftool.config file.
   * @summary Remove a shortcut from the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String } shortcut - A string containing the name of the shortcut to remove.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async removeShortcut(shortcut) {
    const log = debug.extend('removeShortcut')
    const err = error.extend('removeShortcut')
    const o = { value: null, error: null }
    if (shortcut === 'undefined' || shortcut === '') {
      o.error = 'Shortcut name must be provided as a string.'
    } else {
      try {
        const sedCommand = `sed -i.bk "/${shortcut}/d" ${this._exiftool_config}`
        o.command = sedCommand
        log(`sed command: ${sedCommand}`)
        const output = await cmd(sedCommand)
        log(output)
        if (output.stderr === '') {
          o.value = true
        } else {
          o.value = false
          o.error = output.stderr
        }
      } catch (e) {
        err(`Failed to remove shortcut, ${shortcut}, from the exiftool.config file.`)
        err(e)
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
    const log = debug.extend('clearShortcut')
    this._opts.shortcut = ''
    this.setCommand()
    log('Shortcut option cleared.')
  }

  /**
   * Set a specific exiftool shortcut.  The new shortcut must already exist in the
   * exiftool.config file.
   * @summary Set a specific exiftool shortcut to use.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { String } shortcut - The name of a new exiftool shortcut to use.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setShortcut(shortcut) {
    const log = debug.extend('setShortcut')
    const err = error.extend('setShortcut')
    const o = { value: null, error: null }
    if (shortcut === undefined || shortcut === null) {
      o.error = 'Shortcut must be a string value.'
      err(o.error)
    } else {
      this._opts.shortcut = `-${shortcut}`
      this.setCommand()
      o.value = true
      log(`Shortcut set to: ${this._opts.shortcut}`)
    }
    return o
  }

  /**
   * Set one or more explicit metadata tags in the command string for exiftool to extract.
   * @summary Set one or more explicit metadata tags in the command string for exiftool to
   *          extract.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { String|String[]} tagsToExtract - A string or an array of metadata tags to be
   *                                           passed to exiftool.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setMetadataTags(tagsToExtract) {
    const log = debug.extend('setMetadataTags')
    const err = error.extend('setMetadataTags')
    let tags
    log(`>> ${tagsToExtract}`)
    const o = { value: null, error: null }
    if (tagsToExtract === 'undefined' || tagsToExtract === '' || tagsToExtract === null) {
      o.error = 'One or more metadata tags are required'
      err(o.error)
    } else {
      if (Array === tagsToExtract.constructor) {
        log('array of tags')
        // check array elements so they all have '-' prefix
        tags = tagsToExtract.map((tag) => {
          if (!/^-{1,1}[^-]?.+$/.test(tag)) {
            return `-${tag}`
          }
          return tag
        })
        log(tags)
        // join array elements in to a string
        this._opts.tagList = `${tags.join(' ')}`
      }
      if (String === tagsToExtract.constructor) {
        log('string of tags')
        if (tagsToExtract.match(/^-/) === null) {
          this._opts.tagList = `-${tagsToExtract}`
        }
        this._opts.tagList = tagsToExtract
      }
      log(this._opts.tagList)
      log(this._command)
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
   * @throws { Error } Throw an error if -all= tag is included in the tagsToExtract parameter.
   * @throws { Error } Throw an error if exiftool returns a fatal error via stderr.
   * @param { String } [ fileOrDir=null ] - The string path to a file or directory for
   *                                        exiftool to use.
   * @param { String } [ shortcut=''] - A string containing the name of an existing shortcut
   *                                    for exiftool to use.
   * @param { String } [ tagsToExtract=null ] - A string of one or more metadata tags to pass
   *                                            to exiftool.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async getMetadata(fileOrDir = null, shortcut = '', ...tagsToExtract) {
    const log = debug.extend('getMetadata')
    const err = error.extend('getMetadata')
    if (fileOrDir !== null && fileOrDir !== '') {
      await this.setPath(fileOrDir)
    }
    log(`shortcut: ${shortcut}`)
    // if (shortcut !== null && shortcut !== '') {
    if (shortcut !== null && shortcut !== '' && shortcut !== false) {
      this.setShortcut(shortcut)
    } else if (shortcut === null || shortcut === false) {
      this.clearShortcut()
    } else {
      // leave default BasicShortcut in place
      // this.clearShortcut()
      log(`leaving any currenly set shortcut in place: ${this._opts.shortcut}`)
    }
    if (tagsToExtract.length > 0) {
      if (tagsToExtract.includes('-all= ')) {
        err("Can't include metadata stripping -all= tag in get metadata request.")
        throw new Error("Can't include metadata stripping -all= tag in get metadata reqeust.")
      }
      const options = this.setMetadataTags(tagsToExtract.flat())
      log('options', options)
      log('this._opts', this._opts)
      if (options.error) {
        err('options.error', options.error)
        throw new Error('tag list option failed')
      }
    }
    log(this._command)
    try {
      let count
      let metadata
      // Increase the stdio buffer size because some images have almost as much
      // metadata stuffed insided as image data itself.  This sets stdio output
      // buffer size to 10MB x multiplier value.
      if (this._opts.outputFormat === '-xml') {
        metadata = await cmd(this._command, {
          maxBuffer: (1024 * 1204) * this._MAX_BUFFER_MULTIPLIER,
        })
        log('testing new Exiftool.cmd()', JSON.parse(metadata.stdout))
      } else {
        metadata = await this.cmd()
        log('testing new Exiftool.cmd()', metadata.stdout)
      }
      if (metadata.stderr !== '') {
        throw new Error(metadata.stderr)
      }
      const outFormat = this._opts.outputFormat.match(/(?<format>xml.*|json)/i)
      if (outFormat && outFormat.groups.format === 'json') {
        // metadata = JSON.parse(metadata.stdout)
        metadata = metadata.stdout
        count = metadata.length
        metadata.push({ exiftool_command: this._command })
        metadata.push({ format: 'json' })
        metadata.push(count)
      } else if (outFormat && outFormat.groups.format === 'xmlFormat') {
        const tmp = []
        const parser = new fxp.XMLParser()
        const xml = parser.parse(metadata.stdout)
        log(xml)
        tmp.push(xml)
        tmp.push({ raw: metadata.stdout })
        tmp.push({ format: 'xml' })
        tmp.push({ exiftool_command: this._command })
        tmp.push(count)
        metadata = tmp
      } else {
        metadata = metadata.stdout
      }
      log(metadata)
      return metadata
    } catch (e) {
      err(e)
      e.exiftool_command = this._command
      return e
    }
  }

  async getThumbnail(image) {
    return this.getThumbnails(image)
  }

  /**
   * Extract any embedded thumbnail/preview images.
   * @summary Extract any embedded thumbnail/preview images.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String } [image] - The name of the image to get thumbnails from.
   * @throws { Error } Throws an error if getting thumbnail data fails for any reason.
   * @return { Object } Collection of zero or more thumbnails from image.
   */
  async getThumbnails(image) {
    const log = debug.extend('getThumbnails')
    const err = error.extend('getThumbnails')
    if (image) {
      await this.setPath(image)
    }
    if (this._path === null) {
      const msg = 'No image was specified to write new metadata content to.'
      err(msg)
      throw new Error()
    }
    this.setOutputFormat()
    this.clearShortcut()
    this.enableBinaryTagOutput(true)
    this.setMetadataTags('-Preview:all')
    log(this._command)
    let metadata
    try {
      metadata = await cmd(this._command)
      // metadata = await this.cmd(this._command)
      if (metadata.stderr !== '') {
        err(metadata.stderr)
        throw new Error(metadata.stderr)
      }
      metadata = JSON.parse(metadata.stdout)
      metadata.push({ exiftool_command: this._command })
      metadata.push({ format: 'json' })
    } catch (e) {
      err(e)
      e.exiftool_command = this._command
      return e
    }
    // log(metadata)
    return metadata
  }

  /**
   * Embed the given thumbnail data into the image.  Optionally provide a specific metadata
   * tag target.
   * @summary Embed the given thumbnail data into the image.  Optionally provide a specific
   *          metadata tag target.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String } data - A resolved path to the thumbnail data.
   * @param { String } [image = null] - The target image to receive the thumbnail data.
   * @param { String } [tag = 'EXIF:ThumbnailImage'] - Optional destination tag, if other than
   *                                                   the default value.
   * @throws { Error } Throws an error if saving thumbnail data fails for any reason.
   * @return { Object } An object containing success or error messages, plus the exiftool
   *                    command used.
   */
  async setThumbnail(data, image = null, tag = 'EXIF:ThumbnailImage') {
    const log = debug.extend('setThumbnail')
    const err = error.extend('setThumbnail')
    if (!data) {
      const msg = 'Missing required data parameter.'
      err(msg)
      throw new Error(msg)
    }
    if (image) {
      await this.setPath(image)
    }
    const dataPath = path.resolve(data)
    // this.setOverwriteOriginal(true)
    this.setOutputFormat()
    this.clearShortcut()
    this.setMetadataTags(`"-${tag}<=${dataPath}"`)
    log(this._command)
    let result
    try {
      result = await cmd(this._command)
      // result = await this.cmd(this._command)
      result.exiftool_command = this._command
      result.success = true
    } catch (e) {
      err(e)
      e.exiftool_command = this._command
    }
    log(result)
    return result
  }

  /**
   * Extract the raw XMP data as xmp-rdf packet.
   * @summary Extract the raw XMP data as xmp-rdf packet.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throw an error if exiftool returns a fatal error via stderr.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async getXmpPacket() {
    const log = debug.extend('getXmpPacket')
    const err = error.extend('getXmpPacket')
    let packet
    try {
      const command = `${this._executable} ${this._opts.exiftool_config} -xmp -b ${this._path}`
      packet = await cmd(command)
      // packet = await this.cmd(command)
      if (packet.stderr !== '') {
        err(packet.stderr)
        throw new Error(packet.stderr)
      }
      packet.exiftool_command = command
      // const parser = new fxp.XMLParser()
      // const builder = new fxp.XMLBuilder()
      // packet.xmp = builder.build(parser.parse(packet.stdout))
      packet.xmp = packet.stdout
      delete packet.stdout
      delete packet.stderr
    } catch (e) {
      err(e)
      e.exiftool_command = this._command
      return e
    }
    log(packet)
    return packet
  }

  /**
   * Write a new metadata value to the designated tags.
   * @summary Write a new metadata value to the designated tags.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { String|String[] } metadataToWrite - A string value with tag name and new value
   *                                              or an array of tag strings.
   * @throws { Error } Throws error if there is no valid path to an image file.
   * @throws { Error } Thros error if the current path is to a directory instead of a file.
   * @throws { Error } Thros error if the expected parameter is missing or of the wrong type.
   * @throws { Error } Thros error if exiftool returns a fatal error via stderr.
   * @return { Object|Error } Returns an object literal with success or error messages, or
   *                          throws an exception if no image given.
   */
  async writeMetadataToTag(metadataToWrite) {
    const log = debug.extend('writeMetadataToTag')
    const err = error.extend('writeMetadataToTag')
    const o = { value: null, error: null }
    let tagString = ''
    if (this._path === null) {
      const msg = 'No image was specified to write new metadata content to.'
      err(msg)
      throw new Error()
    }
    if (this._isDirectory) {
      const msg = 'A directory was given.  Use a path to a specific file instead.'
      err(msg)
      throw new Error(msg)
    }
    switch (metadataToWrite.constructor) {
      case Array:
        tagString = metadataToWrite.join(' ')
        break
      case String:
        tagString = metadataToWrite
        break
      default:
        throw new Error(
          'Expected a string or an array of strings.  '
          + `Received: ${metadataToWrite.constructor}`,
        )
    }
    try {
      log(`tagString: ${tagString}`)
      const file = `${this._path}`
      // const write = `${this._executable} ${this._opts.exiftool_config} ${tagString} ${file}`
      const write = `${this._executable} `
        + `${this._opts.exiftool_config} `
        + `${this._opts.overwrite_original} `
        + `${tagString} ${file}`
      o.command = write
      const result = await cmd(write)
      // const result = await this.cmd(write)
      if (result.stdout.trim() === null) {
        throw new Error(`Failed to write new metadata to image - ${file}`)
      }
      o.value = true
      o.stdout = result.stdout.trim()
    } catch (e) {
      err(e)
      o.error = e
    }
    return o
  }

  /**
   * Clear the metadata from a tag, but keep the tag rather than stripping it from the image
   * file.
   * @summary Clear the metadata from a tag, but keep the tag rather than stripping it from
   *          the image file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throws error if there is no valid path to an image file.
   * @throws { Error } Throws error if the current path is to a directory instead of a file.
   * @throws { Error } Throws error if the expected parameter is missing or of the wrong type.
   * @throws { Error } Throws error if exiftool returns a fatal error via stderr.
   * @param { String|String[] } tagsToClear - A string value with tag name or an array of tag
   *                                          names.
   * @return { Object|Error } Returns an object literal with success or error messages, or
   *                          throws an exception if no image given.
   */
  async clearMetadataFromTag(tagsToClear) {
    const log = debug.extend('clearMetadataFromTag')
    const err = error.extend('clearMetadataFromTag')
    const o = { value: null, errors: null }
    let tagString = ''
    if (this._path === null) {
      const msg = 'No image was specified to clear metadata from tags.'
      err(msg)
      throw new Error(msg)
    }
    if (this._isDirectory) {
      const msg = 'No image was specified to write new metadata content to.'
      err(msg)
      throw new Error(msg)
    }
    let eMsg
    switch (tagsToClear.constructor) {
      case Array:
        tagString = tagsToClear.join(' ')
        break
      case String:
        tagString = tagsToClear
        break
      default:
        eMsg = `Expected a string or an arrray of strings.  Recieved ${tagsToClear.constructor}`
        err(eMsg)
        throw new Error(eMsg)
    }
    try {
      log(`tagString: ${tagString}`)
      const file = `${this._path}`
      const clear = `${this._executable} ${tagString} ${file}`
      o.command = clear
      const result = await cmd(clear)
      // const result = await this.cmd(clear)
      if (result.stdout.trim() === null) {
        const msg = `Failed to clear the tags: ${tagString}, from ${file}`
        err(msg)
        throw new Error(msg)
      }
      o.value = true
      o.stdout = result.stdout.trim()
    } catch (e) {
      err(e)
      o.error = e
    }
    return o
  }

  /**
   * Run the composed exiftool command to strip all the metadata from a file, keeping a backup
   * copy of the original file.
   * @summary Run the composed exiftool command to strip all the metadata from a file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws { Error } Throws error if instance property _path is missing.
   * @throws { Error } Throws error if instance property _isDirectory is true.
   * @throws { Error } Throws error if exiftool returns a fatal error via stderr.
   * @return { (Object|Error) } Returns a JSON object literal with success message or throws
   *                            an Error if failed.
   */
  async stripMetadata() {
    const log = debug.extend('stripMetadata')
    const err = error.extend('stripMetadata')
    const o = { value: null, error: null }
    if (this._path === null) {
      const msg = 'No image was specified to strip all metadata from.'
      err(msg)
      throw new Error(msg)
    }
    if (this._isDirectory) {
      const msg = 'A directory was given.  Use a path to a specific file instead.'
      err(msg)
      throw new Error(msg)
    }
    // exiftool -all= -o %f_copy%-.4nc.%e copper.jpg
    const file = `${this._path}`
    const strip = `${this._executable} `
      + `-config ${this._exiftool_config} `
      + `${this._opts.overwrite_original} -all= `
      + `${file}`
    o.command = strip
    try {
      const result = await cmd(strip)
      // const result = await this.cmd(strip)
      log(result)
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
      err(o)
    }
    return o
  }

  /**
   * This method takes a single string parameter which is a fully composed metadata query to
   * be passed directly to exiftool.
   * @summary This method takes a single string parameter which is a fully composed metadata
   *          query to be passed directly to exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @throws {Error} Throws error if the single string parameter is not provided.
   * @throws {Error} Throws error if the exiftool command returns a fatal error via stderr.
   * @param { String } query - A fully composed metadata to be passed directly to exiftool.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async raw(query) {
    const log = debug.extend('raw')
    const err = error.extend('raw')
    if (query === '' || typeof query === 'undefined' || query.constructor !== String) {
      const msg = 'No query was provided for exiftool to execute.'
      err(msg)
      throw new Error(msg)
    }
    let command = ''
    const match = query.match(/(^[/?].*exiftool\s)/)
    if (!match) {
      if (this._executable === null) {
        throw new Error(
          'No path to exiftool executable provided.  Include exiftool path in query.',
        )
      }
      command = this._executable
    }
    command += ` ${query}`
    try {
      log(`raw query: ${query}`)
      log(`raw command: ${command}`)
      let result = await cmd(command)
      // let result = await this.cmd(command)
      log(result.stdout)
      const tmp = JSON.parse(result.stdout?.trim())
      const tmperr = result.stderr
      // let result = await _spawn(`'${this._command}'`)
      // let tmp
      // result.stdout.on('data', (data) => {
      //   log(`stdout: ${data}`)
      //   tmp = JSON.parse(data.trim())
      // })
      // let tmperr
      // result.stderr.on('data', (data) => {
      //   // tmperr = result.stderr
      //   tmperr = data
      // })
      result = tmp
      result.push({ exiftool_command: command })
      result.push({ stderr: tmperr })
      log(result)
      return result
    } catch (e) {
      e.exiftool_command = command
      err(e)
      return e
    }
  }
}
