/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'
const cmd = promisify(exec)
import Debug from 'debug'
const debug = Debug('exiftool:metadata')

/**
 * @todo [x] constructor: create a class constructor method to initialize exiftool
 * @todo [x] init: create an options object to set exiftool output behavior
 * @todo [x] - add a jest test case for instance creation
 * @todo [x] which: create a class method to verify exiftool is avaiable
 * @todo [x] - add a jest test case to verify exiftool is available
 * @todo [x] hasExiftoolConfigFile: create a class method to check if exiftool.config file exists
 * @todo [x] - add a jest test case to find present/missing config file
 * @todo [x] createExiftoolConfigFile: create a class method to create exiftool.config file if missing
 * @todo [x] - add a jest test case to verify creation of new config file
 * @todo [x] - add a jest teardown to remove newly created copies of the exiftool.config file
 * @todo [x] hasShortcut: create a class method to check if a shortcut exists
 * @todo [x] - add a jest test case to check if a shortcut exists
 * @todo [x] addShortcut: create a class method to add a shortcut
 * @todo [x] - add a jest test case to add a shortcut
 * @todo [x] removeShortcut: create a class method to remove a shortcut
 * @todo [x] - add a jest test case to remove a shortcut
 * @todo [x] getMetadata: create a class method to extract metadata using custom shortcut
 * @todo [x] - add a jest test case to extract metadata using a custom shortcut
 * @todo [x] getMetadata: create a class method to extract all metadata
 * @todo [x] - add a jest test case to extract all metadata
 * @todo [x] getMetadata: create a class method to extract arbitrary metadata
 * @todo [x] - add a jest test case to extract arbitrary metadata
 * @todo [x] - add a jest test case to prevent passing -all= tag to getMetadata method
 * @todo [x] stripMetadata: create a class method to strip all metadata from an image
 * @todo [x] add a jest test case to strip all metadata from an image
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
   * @param { string } path - String value of file path to an image file or directory of images.
   */
  constructor( path ) {
    debug('constructor method entered')
    this._imgDir = path || null
    this._cwd = __dirname
    this._path = path || null
    this._exiftool_config = `${this._cwd}/exiftool.config`
    this._isDirectory = null
    this._fileStats = null
    this._opts = {}
    this._opts.exiftool_config = `-config ${this._exiftool_config}`
    this._opts.outputFormat = `-json`
    this._opts.gpsFormat = `-c "%.6f"`
    this._opts.tagList = null
    this._opts.shortcut = `-BasicShortcut`
    this._opts.includeTagFamily = `-G`
    this._opts.compactFormat = `-s3`
    this._opts.quiet = `-q`
    this._opts.excludeTypes = `--ext TXT --ext JS  --ext JSON  --ext MJS --ext CJS --ext MD --ext HTML`
    this._command = null 
    //this.setCommand()
  }

  /**
   * Initializes some asynchronus properties.
   * @summary Initializes some asynchronus class properties not done in the constructor.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } path - A file system path to set for exiftool to process.
   * @return { (Exiftool|boolean) } Returns fully initialized instance or false.
   */
  async init( path ) {
    debug('init method entered')
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
    debug('setCommand method entered')
    this._command = `${this._executable} ${this.getOptions()} ${this._path}`
  }

  /**
   * Set the path for image file or directory of images to process with exiftool.
   * @summary Set the path of image file or directory of images to process with exiftool.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } path - A file system path to set for exiftool to process.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async setPath( path ) {
    debug('setPath method entered')
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
   * Get the fully qualified path to the image (or directory) specified in init.
   * @summary Get the full qualified path to the image.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @asynn
   * @return { Object } Returns an object literal with success or error messages.
   */
  async getPath() {
    
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
    debug('createExiftoolConfigFile method entered')
    let o = {value: null, error: null}
    let stub = `%Image::ExifTool::UserDefined::Shortcuts = (
    BasicShortcut => ['file:FileName','exif:ImageDescription','iptc:ObjectName','iptc:Caption-Abstract','iptc:Keywords','Composite:GPSPosition'],
);`
    //let fileName = `${this._cwd}/exiftool.config`
    let fileName = this._exiftool_config
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
   * @param { string } shortcut - The name of a shortcut to check if it exists in the exiftool.config.
   * @return { boolean } Returns true if the shortcut exists in the exiftool.config, false if not.
   */
  async hasShortcut( shortcut ) {
    debug('hasShortcut method entered')
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
   * Add a new shortcut to the exiftool.config file.
   * @summary Add a new shortcut to the exiftool.config file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } newShortcut - The string of text representing the new shortcut to add to exiftool.config file.
   * @return { Object } Returns an object literal with success or error messages.
   */
  async addShortcut( newShortcut ) {
    debug('addShortcut method entered')
    let o = {value: null, error: null}
    if ('undefined' == newShortcut || '' == newShortcut) {
      o.error = "Shortcut name must be provided as a string."
    } else {
      try {
        let sedCommand = `sed -i.bk "2i\\    ${newShortcut}," ${this._exiftool_config}`
        debug(`sed command: ${sedCommand}`)
        let output = await cmd( sedCommand )
        let stdout = output.stdout
        debug(output)
        if ('' == output.stderr) {
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
  async removeShortcut( shortcut ) {
    debug('removeShortcut method entered')
    let o = {value: null, error: null}
    if ('undefined' == shortcut || '' == shortcut) {
      o.error = "Shortcut name must be provided as a string."
    } else {
      try {
        // sed -i '/NewShortcut/d' exiftool.config.test
        let sedCommand = `sed -i.bk "/${shortcut}/d" ${this._exiftool_config}`
        debug(`sed command: ${sedCommand}`)
        let output = await cmd( sedCommand )
        let stdout = output.stdout
        debug(output)
        if ('' == output.stderr) {
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
   * Set a specific exiftool shortcut.  The new shortcut must already exist in the exiftool.config file.
   * @summary Set a specific exiftool shortcut to use.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param { string } shortcut - The name of a new exiftool shortcut to use.
   * @return { Object } Returns an object literal with success or error messages.
   */
  setShortcut( shortcut ) {
    debug('setShortcut method entered')
    let o = {value: null, error: null}
    if ('undefined' == shortcut || null == shortcut) {
      o.error = "Shortcut must be a string value."
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
  setMetadataTags( tagsToExtract ) {
    debug('setMetadataTags method entered')
    let tags = tagsToExtract
    debug(`>> ${tags}`)
    let o = {value: null, error: null}
    if ('undefined' == tags || '' == tags || null == tags) {
      o.error = 'One or more metadata tags are required'
    } else {
      if (Array === tags.constructor) {
        debug('array of tags')
        // join array elements in to a string
        this._opts.tagList = `-${tags.join(' -')}`
      }
      if (String === tags.constructor) {
        debug('string of tags')
        if (null == tags.match(/^-/)) {
          this._opts.tagList = `-${tags}`
        }
        this._opts.tagList = tags
      }
      debug(this._opts.tagList)
      debug(this._command)
      this.setCommand()
      o.value = true
    }
    return o
  }

  /**
   * Concatenate all the exiftool options together into a single string.
   * @summary Concatenate all the exiftool options together into a single string.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @return { string } Commandline options to exiftool.
   */
  getOptions() {
    debug('getOptions method entered')
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
    debug('which method entered')
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
   * Run the composed exiftool command to get the requested exif metadata.
   * @summary Get the exif metadata for one or more image files.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @param { string } [ fileOrDir=null ] - The string path to a file or directory for exiftool to use.
   * @param { string } [ shortcut=null ] - A string containing the name of an existing shortcut for exiftool to use.
   * @param { string } [ tagsToExtract=null ] - A string of one or more metadata tags to pass to exiftool.
   * @return { (Object|Error) } JSON object literal of metadata or throws an Error if failed.
   */
  async getMetadata( fileOrDir=null, shortcut=null, tagsToExtract=null) {
    debug('getMetadata method entered')
    if (null != fileOrDir && '' != fileOrDir) {
      this.setPath(fileOrDir)
    }
    if (null != shortcut && '' != shortcut) {
      this.setShortcut(shortcut)
    }
    if (null != tagsToExtract && '' != tagsToExtract) {
      if (tagsToExtract.includes('-all= ')) {
        debug("Can't include metadata stripping -all= tag in get metadata request.")
        throw new Error("Can't include metadata stripping -all= tag in get metadata reqeust.")
      }
      let options = this.setMetadataTags(tagsToExtract)
      debug(options)
      debug(this._opts)
      if (options.error) {
        throw new Error('tag list option failed')
      }
    }
    debug(this._command)
    try {
      let metadata = await cmd(this._command)
      if ('' != metadata.stderr) {
        throw new Error(metadata.stderr)
      }
      metadata = JSON.parse(metadata.stdout)
      metadata.exiftool_command = this._command
      debug(metadata)
      return metadata
    } catch (e) {
      debug(e)
      return e
    }
  }

  /**
   * Run the composed exiftool command to strip all the metadata from a file, keeping a backup copy of the original file.
   * @summary Run the composed exiftool command to strip all the metadata from a file.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @async
   * @return { (Object|Error) } Returns a JSON object literal with success message or throws an Error if failed.
   */
  async stripMetadata() {
    debug('stripMetadata method entered')
    let o = {value: null, error: null}
    if (null == this._path) {
      throw new Error('No image was specified to strip all metadata from.')
    }
    if (this._isDirectory) {
      throw new Error('A directory was given.  Use a path to a specific file instead.')
    }
    // exiftool -all= -o %f_copy%-.4nc.%e copper.jpg
    let exiftool = await this.which()
    let file = `${this._cwd}/${this._path}`
    let strip = `${exiftool.value} -config ${this._exiftool_config} -all= ${file}`
    o.command = strip
    try {
      let result = await cmd( strip ) 
      debug(result)
      if (null == result.stdout.trim().match(/files updated/)) {
        throw new Error(`Failed to strip metadata from image - ${file}.`)
      }
      o.value = true
      o.original = `${file}_original`
    } catch (e) {
      o.value = false
      o.error = e
      debug(o)
    }
    return o
  }


}

