/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */

import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'
const cmd = promisify(exec)
import Debug from 'debug'
const debug = Debug('exiftool:metadata')

/**
 * @todo [x] create a class constructor method to initialize exiftool
 * @todo [x] create a jest test for instance creation
 * @todo [x] create an options object to set exiftool output behavior
 * @todo [x] create a class method to verify exiftool is avaiable
 * @todo [x] create a jest test to verify exiftool is available
 * @todo [x] create a class method to check if exiftool.config file exists
 * @todo [x] create a jest test to find present/missing config file
 * @todo [x] create a class method to create exiftool.config file if missing
 * @todo [x] create a jest test to verify creation of new config file
 * @todo [x] create a class method to check if a shortcut exists
 * @todo [x] create a jest test to check shortcut names
 * @todo [x] create a class method to extract metadata using custom shortcut
 * @todo [ ] create a class method to add/update a shortcut
 * @todo [ ] create a jest test to add/update a shortcut
 * @todo [ ] create a class method to extract all metadata
 * @todo [ ] create a class method to extract arbitrary metadata
 * @todo [ ] create a class method to strip all metadata from an image
 * @todo [ ] create a jest test for each class method
 * 
 */

/**
 * A class wrapping the exiftool metadata tool.
 * @summary A class wrapping the exiftool image metadata extraction tool.
 * @class Exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */
export class Exiftool {
  /**
   * Create an instance of the exiftool wrapper.
   * @param { string } path String value of file path to an image file or directory of images.
   */
  constructor( path ) {
    this._cwd = process.cwd()
    this._path = path || null
    this._exiftool_config = `${this._cwd}/exiftool.config`
    this._isDirectory = null
    this._fileStats = null
    this._opts = {}
    this._opts.exiftool_config = `-config ${this._exiftool_config}`
    this._opts.outputFormat = `-json`
    this._opts.gpsFormat = `-c "%.6f"`
    this._opts.shortcut = `-BasicShortcut`
    this._opts.includeTagFamily = `-G`
    this._opts.compactFormat = `-s3`
    this._opts.quite = `-q`
    this._opts.excludeTypes = `--ext TXT --ext JS  --ext JSON  --ext MJS --ext CJS --ext MD --ext HTML`
    this._command = null 
    //this.setCommand()
  }

  /**
   * Initializes some asynchronus properties.
   * @summary Initializes some asynchronus class properties not done in the constructor.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } path A file system path to set for exiftool to process.
   * @return { (Exiftool|boolean) } Returns fully initialized instance or false.
   */
  async init( path ) {
    if (('undefined' == typeof path) && (null == this._path)) {
      debug('Param: path - was undefined.')
      debug(`Instance property: path - ${this._path}`)
      return false
    } else if (path) {
      try {
        await this.setPath(path)
      } catch (e) {
        debug(e)
        return false
      }
    } 
    try {
      debug('checking if config file exists.')
      if (await this.hasExiftoolConfigFile()) {
        debug('exiftool.config file exists')
      } else {
        debug('missing exiftool.config file')
        debug('attempting to create empty exiftool.config file') 
        let result = this.createExiftoolConfigFile()
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
    try {
      let result = await this.which()
      this._executable = result.value 
      debug('setting the command string')
      this.setCommand()
    } catch (e) {
      debug('could not find exiftool command')
      debug(e)
    }
    return this
  }

  /**
   * Set the full command string from the options.
   * @summary Set the full command string from the options.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { undefined }
   */
  setCommand() {
    this._command = `${this._executable} ${this.getOptions()} ${this._path}`
  }

  /**
   * Set the path for image file or directory of images to process with exiftool.
   * @summary Set the path of image file or directory of images to process with exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } path A file system path to set for exiftool to process.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setPath( path ) {
    let o = {value: null, error: null}
    if ('undefined' == path || null == path) {
      o.error = "A path to image or directory is required."
      return o
    }
    try {
      this._path = path
      this._fileStats = await stat(path)
      this._isDirectory = this._fileStats.isDirectory()
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
   * Check to see if the exiftool.config file is present at the expected path.
   * @summary Check to see if the exiftool.config file is present at the expected path.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { boolean } Returns True if present, False if not.
   */
  async hasExiftoolConfigFile() {
    debug('>')
    let exists = false
    let file = this._exiftool_config
    //let file = `${this._exiftool_config}.missing`
    try {
      debug('>>')
      let stats = await stat(file)
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
    let o = {value: null, error: null}
    let stub = `%Image::ExifTool::UserDefined::Shortcuts = (
    BasicShortcut => ['file:FileName','exif:ImageDescription','iptc:ObjectName','iptc:Caption-Abstract','iptc:Keywords','Composite:GPSPosition'],
);`
    let fileName = `${this._cwd}/exiftool.config.test`
    let echo = `echo "${stub}" > ${fileName}`
    try {
      debug('attemtping to create exiftool.config file')
      let result = cmd(echo)
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
   * Check the exiftool.config to see if the specified shortcut exists.
   * @summary Check to see if a shortcut exists.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } shortcut The name of a shortcut to check if it exists in the exiftool.config.
   * @return { boolean } Returns true if the shortcut exists in the exiftool.config, false if not.
   */
  async hasShortcut( shortcut ) {
    let exists
    debug('>')
    if ('undefined' == shortcut || null == shortcut) {
      debug('>>')
      exists = false
    } else {
      debug('>>>')
      try {
        let output = await cmd(`grep ${shortcut} ${this._exiftool_config}`)
        let stdout = output.stdout.trim().match(shortcut)
        debug('>>>>')
        if (shortcut == stdout[0]) {
          debug('>>>>>')
          exists = true
        } else {
          debug('>>>>>>')
          exists = false
        }
      } catch (e) {
        debug('>>>>>>>')
        debug(e)
        exists = false
      }
    }
    debug('>>>>>>>>')
    return exists
  }

  /**
   * Set a specific exiftool shortcut.  The new shortcut must already exist in the exiftool.config file.
   * @summary Set a specific exiftool shortcut to use.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } shortcut The name of a new exiftool shortcut to use.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setShortcut( shortcut ) {
    let o = {value: null, error: null}
    if ('undefined' == shortcut || null == shortcut) {
      o.error = "Shortcut must be a string value."
    }
    this._opts.shortcut = shortcut
    this.setCommand()
    o.value = true
    return o
  }

  /**
   * Concatenate all the exiftool options together into a single string.
   * @summary Concatenate all the exiftool options together into a single string.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { string } Commandline options to exiftool.
   */
  getOptions() {
    return Object.values(this._opts).join(' ')
  }

  /**
   * Find the path to the executable exiftool binary.
   * @summary Find the path to the executable exiftool binary.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { Object } Returns an object literal with file system path to exiftool binary or error if not found.
   */
  async which() {
    let o = {value: null, error: null}
    try {
      let path = await cmd('which exiftool')
      if ('\n' == path.stdout.slice(-1)) {
        o.value = path.stdout.slice(0,-1) 
      }
    } catch (e) {
      o.error = e 
    }
    return o
  }

  /**
   * Run the composed exiftool commend to get the requested exif metadata.
   * @summary Get the exif metadata for one or more image files.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { (Object|Error) } JSON object literal of metadata or Error if failed.
   */
  async getMetadata() {
    try {
      let metadata = await cmd(this._command)
      if ('' != metadata.stderr) {
        throw new Exeception(metadata.stderr)
      }
      metadata = JSON.parse(metadata.stdout)
      debug(metadata)
      return metadata
    } catch (e) {
      debug(e)
      return e
    }
  }
}

