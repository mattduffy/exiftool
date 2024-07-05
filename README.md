# Extract Image Metadata with Exiftool

This package for Node.js provides an object-oriented wrapper around the phenomenal utility, [exiftool](https://exiftool.org), created by [Phil Harvey](https://exiftool.org/index.html#donate).  This package requires the ```exiftool``` perl library to already be installed.  Installation instructions can be found [here](https://exiftool.org/install.html).  This package is compatible with POSIX systems; it will not work on a Windows machine.  This package will not run in a browser.

## Using Exiftool
This package attempts to abstract the various uses of exiftool into a small collection of distinct methods that help to reduce the difficulty of composing complex metadata processing incantations.  The Exiftool class instantiates with a reasonable set of default options to produce explicitly labeled, yet compact, metadata output in JSON format.  The included options are easily modified if necessary, and even more customized exiftool incantations can be created and saved as [shortcuts](https://exiftool.org/TagNames/Shortcuts.html) in an [exiftool.config](https://exiftool.org/config.html) file.  

```bash
npm install --save @mattduffy/exiftool
```

```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = new Exiftool()
```

The Exiftool class constructor does most of the initial setup.  A call to the ```init()``` method is currently necessary to complete setup because it makes some asynchronous calls to determine the location of exiftool, whether the exiftool.config file is present - creating one if not, and composing the exiftool command string from the default options.  The ```init()``` method takes a string parameter which is the file system path to an image file or a directory of images.  This is an **Async/Await** method.
```javascript
exiftool = await exiftool.init( '/www/site/images/myNicePhoto.jpg' )

// or in one line...
let exiftool = await new Exiftool().init( '/www/site/images/myNicePhoto.jpg' )
```
It is also possible to pass an array of strings to the ```init()``` method if you have more than one image.
```javascript
let images = ['/www/site/images/one.jpg', '/www/site/images/two.jpg', '/www/site/images/three.jpg']
let exiftool = await new Exiftool().init(images)
```

At this point, Exiftool is ready to extract metadata from the image ```myNicePhoto.jpg```.  Use the ```getMetadata()``` to extract the metadata.    This is an **Async/Await** method.  

There are a few options to choose what metadata is extracted from the file:
- using default options, including a pre-configured shortcut
- override the default shortcut name with a different one (already added to the exiftool.config file)
- adding additional [Exiftool Tags](https://exiftool.org/TagNames/index.html) to extract beyond those included in the default shortcut

```javascript
// Using just the default options.
let metadata1 = await exiftool.getMetadata()

// Changing the image path, if you want, for some reason.
let metadata2 = await exiftool.getMetadata( '/path/to/a/different/image.jpg', '', '' )

// Using all the default options, but calling a different shortcut 
// previously saved to the exiftool.config file.
let metadata3 = await exiftool.getMetadata( '', 'ADifferentSavedShortcut', '' )

// Adding Tags to command to be extracted, in additon to those 
// specified in the shortcut.  For example, extracting LensInfo, 
// FocalLength, ImageWidth and ImageHeight values (if present).
let metadata4 = await exiftool.getMetadata( '', '', 'EXIF:LensInfo', 'EXIF:FocalLength', 'File:ImageWidth', 'File:ImageHeight' )

// All three parameters can be used at once if desired.
let metadata5 = await exiftool.getMetadata( '/path/to/a/different/image.jpg', 'ADifferentSavedShortcut', 'EXIF:LensInfo', 'EXIF:FocalLength', 'File:ImageWidth', 'File:ImageHeight' )
```

The simplest use of Exiftool looks like this:
 ```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
let metadata = await exiftool.getMetadata()
console.log( metatdata )
// [
//   {
//     SourceFile: 'images/copper.jpg',
//     'File:FileName': 'copper.jpg',
//     'EXIF:ImageDescription': 'Copper curtain fixture',
//     'IPTC:ObjectName': 'Tiny copper curtain rod',
//     'IPTC:Caption-Abstract': 'Copper curtain fixture',
//     'IPTC:Keywords': 'copper curtain fixture',
//     'Composite:GPSPosition': `48 deg 8' 49.20" N, 17 deg 5' 52.80" E`
//   },
//   {
//     exiftool_command: '/usr/local/bin/exiftool -config /home/node_packages/exiftool/exiftool.config -json -BasicShortcut -groupNames -s3 -quiet --ext TXT --ext JS --ext JSON --ext MJS --ext CJS --ext MD --ext HTML images/copper.jpg'
//   },
//   1
// ]
 ```
The ```exiftool_command``` property is the command composed from all the default options, using the pre-configured BasicShortcut saved in the exiftool.config file.

The last element in the metadata array is the count of files that exiftool inspected and returned data for.

#### Command Not Found!

This node.js package can only function if [exiftool](https://exiftool.org/install.html) is installed.  This node.js package DOES NOT install the necessary, underlying ```exiftool``` executable.  If ```exiftool``` is not installed, or is not available in the system path, it will throw an error and interrupt execution.

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
Error: ATTENTION!!! exiftool IS NOT INSTALLED.  You can get exiftool here: https://exiftool.org/install.html
    at Exiftool.init (file:///www/exiftool/src/index.js:83:13)
    at async REPL17:1:38 {
  [cause]: Error: Exiftool not found?
      at Exiftool.which (file:///www/exiftool/src/index.js:498:13)
      at async Exiftool.init (file:///www/exiftool/src/index.js:73:28)
      at async REPL17:1:38
      at async node:repl:646:29 {
    [cause]: Error: Command failed: which exitfool
```

#### Extracting Binary Tag Data
There are several tags that store binary data, such as image thumbnails, color profile, image digests, etc..  The default state for exiftool is to not extract binary data from tags.  If you would like to extract the binary data, use the ```enableBinaryTagOutput(<boolean>)``` method before calling the ```getMetadata()``` method.

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
exiftool.enableBinaryTagOutput(true)
let metadata = await exiftool.getMetadata()
let thumbnail = metadata[0]['EXIF:ThumbnailImage']
console.log(thumbnail)
// 'base64:/9j/4AAQSkZJRgABAgEASABIAAD/4QKkaHR.........'
```

#### Metadata Output Format
The default output format when issuing metadata queries is JSON.  You can change the output format to XML by calling the ```setOutputFormat(<xml|json>)``` method before calling the ```getMetadata()``` method.

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
exiftool.setOutputFormat('xml')
let xml = await exiftool.getMetadata()
console.log(xml)
// [
//  "<?xml version='1.0' encoding='UTF-8'?>
//  <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>
//    <rdf:Description rdf:about='__tests__/images/copper.jpg'
//      xmlns:et='http://ns.exiftool.org/1.0/' et:toolkit='Image::ExifTool 12.68'
//      xmlns:System='http://ns.exiftool.org/File/System/1.0/'
//      xmlns:File='http://ns.exiftool.org/File/1.0/'>
//     <System:FileSize>3.3 MB</System:FileSize>
//     <File:FileType>JPEG</File:FileType>
//     ...
//     <File:YCbCrSubSampling>YCbCr4:2:0 (2 2)</File:YCbCrSubSampling>
//    </rdf:Description>
//  </rdf:RDF>",
//  { raw: "<?xml version='1.0' encoding='UTF-8'?>..." },
//  { format: 'xml' },
//  { exiftool_command: '/usr/local/bin/exiftool -config exiftool.config -json -xmp:all  -groupNames -s3 -quiet --ext cjs --ext css --ext html --ext js --ext json --ext md --ext mjs --ext txt images/copper.jpg'},
//  1,
// ]
```

#### Location Coordinate Output Formatting
The default output format used by ```exiftool``` to report location coordinates looks like ```54 deg 59' 22.80"```.  The coordinates output format can be changed using `printf` style syntax strings. To change the location coordinate output format, use the ```setGPSCoordinatesOutputFormat(<printf fmt|'[+]gps'>)``` method before calling the ```getMetadata()``` method.  ```ExifTool``` provides a simple alias ```gps``` to set the output to typical GPS style ddd.nnnnnn notation (%.6f printf syntax, larger number will provide higer precision).  See the [exiftool -coordFormat](https://exiftool.org/exiftool_pod.html#c-FMT--coordFormat) documentation for more details on controlling coordinate output formats.

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
let defaultLocationFormat = await exiftool.getMetadata('', null, 'EXIF:GPSLongitude', 'EXIF:GPSLongitudeRef')
console.log(defaultLocationFormat[0]['EXIF:GPSLongitude'], defaultLocationFormat[0]['EXIF:GPSLongitudeRef'])
// 122 deg 15' 16.51" West
exiftool.setGPSCoordinatesOutputFormat('gps')
// or exiftool.setGPSCoordinatesOutputFormat('+gps') for signed lat/lon values in Composite:GPS* tags
let myLocationFormat = await exiftool.getMetadata('', null, 'EXIF:GPSLongitude', 'EXIF:GPSLongitudeRef')
console.log(myLocationFormat[0]['EXIF:GPSLongitude'], myLocationFormat[0]['EXIF:GPSLongitudeRef'])
// 122.254586 West
```

#### Raw XMP Packet Data
To extract the full Adobe XMP packet, if it exists within an image file, you can use the ```getXmpPacket()``` method.  This method will extract only the xmp metadata.  The metadata will be a serialized string version of the raw XMP:RDF packet object.  This is an **Async/Await** method. 

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
let xmpPacket = await exiftool.getXmpPacket()
console.log(xmpPacket)
// {
//    exiftool_command: '/usr/local/bin/exiftool -config /app/src/exiftool.config -xmp -b /www/images/copper.jpg',
//    xmp: '<?xpacket?><?xpacket?><x:xmpmeta><rdf:RDF><rdf:Description><xmpMM:...
//    ...
//    </rdf:Description></rdf:RDF></x:xmpmeta>'
// }
```

#### XMP Structured Tags
XMP tags can contain complex, structured content.  ```exiftool``` is able to extract this [structured content](https://exiftool.org/struct.html), or flatten it into a single value.  The default state for exiftool is to flatten the tag values.  If you would like to extract the complex structured data, use the ```enableXMPStructTagOutput(<boolean>)``` method before calling the ```getMetadata()``` method.  See the [exiftool -struct](https://exiftool.org/exiftool_pod.html#struct---struct) documentation for more details on how to access nested / structured fields in XMP tags.

```javascript
let exiftool = await new Exiftool().init( 'images/copper.jpg' )
exiftool.enableXMPStructTagOutput(true)
let metadata = await exiftool.getMetadata()
```

#### MWG Composite Tags
The Metadata Working Group has created a recommendation for how to read and write to tags which contain values repeated in more than one tag group.  ```exiftool``` provides the ability to keep these overlapping tag values synchronized with the [MWG module](https://exiftool.org/TagNames/MWG.html).  Use the ```useMWG(<boolean>)``` method to cause ```exiftool``` to follow the MWG 2.0 recommendations.  The overlapping tags will be reduced to their 2.0 recommendation and reported assigned to the ```Composite:*``` tag group.

```javascript
let exiftool = await new Exiftool().init( 'images/IPTC-PhotometadataRef-Std2021.1.jpg' )
exiftool.useMWG(true)
let metadata = await exiftool.getMetadata('', '', '-MWG:*')
console.log(metadata[0])
// [
//   {
//     SourceFile: 'images/IPTC-PhotometadataRef-Std2021.1.jpg',
//     'Composite:City': 'City (Location shown1) (ref2021.1)',
//     'Composite:Country': 'CountryName (Location shown1) (ref2021.1)',
//     'Composite:Copyright': 'Copyright (Notice) 2021.1 IPTC - www.iptc.org  (ref2021.1)',
//     'Composite:Description': 'The description aka caption (ref2021.1)',
//     'Composite:Keywords': [ 'Keyword1ref2021.1', 'Keyword2ref2021.1', 'Keyword3ref2021.1' ]
//   },
//   {
//     exiftool_command: '/usr/local/bin/exiftool -config /home/node_packages/exiftool/exiftool.config -json -BasicShortcut -groupNames -s3 -quiet --ext TXT --ext JS --ext JSON --ext MJS --ext CJS --ext MD --ext HTML images/IPTC-PhotometadataRef-Std2021.1.jpg'
//   },
//   1
// ]
```

#### Excluding Files by File Type
Because ```exiftool``` is such a well designed utility, it naturally handles metadata queries to directories containing images just as easily as to a specific image file.  It will automatically recurse through a directory and process any image file types that it knows about.  Exiftool is designed with this in mind, by setting a default list of file types to exclude, including TXT, JS, CJS, MJS, JSON, MD, HTML, and CSS.  This behavior can be altered by modifying the list of extensions to exclude with the ```setExtensionsToExclude()``` method.

```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = new Exiftool()
let extensionsArray = img.getExtensionsToExclude()
extensionsArray.push( 'ESLINT' )
img.setExtensionsToExclude( extensionsArray )
exiftool = await exiftool.init( 'images/' )
let metadata = await exiftool.getMetadata()
 console.log( metatdata )
[
  {
    SourceFile: 'images/IMG_1820.heic',
    'File:FileName': 'IMG_1820.heic',
    'Composite:GPSPosition': `48 deg 8' 49.20" N, 17 deg 5' 52.80" E`
  },
  {
    SourceFile: 'images/copper.jpg',
    'File:FileName': 'copper.jpg',
    'EXIF:ImageDescription': 'Copper curtain fixture',
    'IPTC:ObjectName': 'Tiny copper curtain rod',
    'IPTC:Caption-Abstract': 'Copper curtain fixture',
    'IPTC:Keywords': 'copper curtain fixture',
    'Composite:GPSPosition': `48 deg 8' 49.20" N, 17 deg 5' 52.80" E`
  },
  {
    SourceFile: 'images/IMG_1820.jpg',
    'File:FileName': 'IMG_1820.jpg',
    'Composite:GPSPosition': `48 deg 8' 49.20" N, 17 deg 5' 52.80" E`

  },
  {
    exiftool_command: '/usr/local/bin/exiftool -config /home/node_package_development/exiftool/exiftool.config -json -coordFormat "%.6f"  -BasicShortcut -groupNames -s3 -quiet --ext TXT --ext JS --ext JSON --ext MJS --ext CJS --ext MD --ext HTML --ext ESLINT images/'
  },
  3
]
```

### The exiftool.config File
This file is not required to be present to process metadata by the original ```exiftool```, but it can help a lot with complex queries, so this Exiftool package uses it.  During the ```init()``` setup, a check is performed to see if the file is present in the root of the package directory.  If no file is found, a very basic file is created, populated with a simple shortcut called ```BasicShortcut```.  The path to this file can be overridden to use a different file.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
let oldConfigPath = exiftool.getConfigPath()
console.log( oldConfigPath )
{
  value: '/path/to/the/exiftool/exiftool.config',
  error: null
}
```
```javascript
let newConfigFile = '/path/to/new/exiftool.config'
let result = await exiftool.setConfigPath( newConfigFile )
let metadata = await exiftool.getMetadata()
```

### Shortcuts
The original ```exiftool``` provides a very convenient way to save arbitrarily complex metadata queries in the form of **shortcuts** saved in an ```exiftool.config``` file.  New shortcuts can be added to the ```exiftool.config``` managed by the package.  If a different ```exiftool.config``` file is used, do not try to save new shortcuts to that file with this method.  To add a new shortcut, use ```addShortcut()```.  This is an **Async/Await** method.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
// Check to see if a shortcut with this name is already 
// present in the package provided exiftool.config file
if (!await exiftool.hasShortcut( 'MyCoolShortcut' )) {
  // Shortcut was not found, save the shortcut definition to the exiftool.config file
  let result = await exiftool.addShortcut( "MyCoolShortcut => ['EXIF:LensInfo', 'EXIF:FocalLength', 'File:ImageWidth', 'File:ImageHeight']" )
  console.log( result )
}
```
To change the default shortcut (BasicShortcut) to something else, that has already been added to the ```exiftool.config``` file, use the ```setShortcut()``` method.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
let result = exiftool.setShortcut( 'MyCoolShortcut' )
let metadata = await exiftool.getMetadata()

// Alternatively, pass the shortcut name as a parameter in the getMetadata() method
let metadata = await exiftool.getMetadata( '', 'MyCoolShortcut', '' )
```

To remove a shortcut from the package provided ```exiftool.config``` file use the ```removeShortcut()``` method.  This is an **Async/Await** method.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
// Check to see if a shortcut with this name is already 
// present in the package provided exiftool.config file
if (await exiftool.hasShortcut( 'MyCoolShortcut' )) {
  // Shortcut was found, now remove it
  let result = await exiftool.removeShortcut( 'MyCoolShortcut' )
  console.log( result )
}
```
The ```exiftool.config``` file generated by ```Exiftool``` includes a few useful shortcuts:
- BasicShortcut
- Location
- StripGPS


Exiftool creates a backup of the ```exiftool.config``` file each time it is modified by the ```addShortcut()``` or ```removeShortcut()``` methods.

### Writing Metadata to a Tag
```exiftool``` makes it easy to write new metadata values to any of the hundreds of tags it supports by specifying the tag name and the new value to write.  Any number of tags can be written to in one command.  A full discussion is beyond the scope of this documentation, but information on the types of tag values (strings, lists, numbers, binary data, etc.) can be found [here](https://exiftool.org/TagNames/index.html).  Exiftool provides the ```writeMetadataToTag()``` method to support this functionality.  This method works on a single image file at a time.  It takes either a string, or an array of strings, formated according to these [rules](https://exiftool.org/exiftool_pod.html#WRITING-EXAMPLES).

The general format to write a new value to a tag is: ```-TAG=VALUE``` where TAG is the tag name, ```=``` means write the new ```VALUE```.  For tags that store list values, you can add an item to the list ```-TAG+=VALUE```.  The ```+=``` is like ```Array.push()```.  Likewise, ```-TAG-=VALUE``` is like ```Array.pop()```.

This is an **Async/Await** method.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
let tagToWrite = '-IPTC:Headline="Wow, Great Photo!"'
let result1 = await exiftool.writeMetadataToTag( tagToWrite )
console.log(result1)
//{
//   value: true,
//   error: null,
//   command: '/usr/local/bin/exiftool -IPTC:Headline="Wow, Great Photo!" /path/to/image.jpg',
//   stdout: '1 image files updated'
//}
```
Multiple tags can be written to at once by passing an array to ```writeMetadataToTag()```.  

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
let tagArray = ['-IPTC:Contact="Photo McCameraguy"', '-IPTC:Keywords+=News', '-IPTC:Keywords+=Action']
let result2 = await exiftool.writeMetadataToTag( tagArray )
console.log(result2)
//{
//   value: true,
//   error: null,
//   command: '/usr/local/bin/exiftool -IPTC:Contact="Photo McCameraguy" -IPTC:Keywords+=News -IPTC:Keywords+=Action /path/to/image.jpg',
//   stdout: '1 image files updated'
//}
```

#### Setting a Location
There are many tags that can contain location-related metadata, from GPS coordinates, to locality names.  Setting a location is complicated by the fact that there is more than one tag group capable of holding these valuse.  IPTC, EXIF, and XMP can all store some amount of overlapping location data.  The Metadata Working Group provides a way to keep some of these values in sync across tag groups, but doesn't include location coordinates.  To help keep location data accurate and in-sync, ```Exiftool``` provides the ```setLocation()``` method.  It takes an object literal parameter with latitude/longitude coordinates and locality names if desired.  This is an **Async/Await** method.

```javascript
let exiftool = await new Exiftool().init('/path/to/image.jpg')
const coordinates = {
  latitude: 40.748193,
  longitude: -73.985062,
  city: 'New York City',              // optional
  state: 'New York',                  // optional
  country: 'United States',           // optional
  countryCode: 'USA',                 // optional
  location: 'Empire State Building',  // optional
}
const result = await exiftool.setLocation(coordinates)
```

### Clearing Metadata From a Tag
Tags can be cleared of their metadata value.  This is essentially the same as writing an empty string to the tag.  This is slighlty different that stripping the tag entirely from the image.  Exiftool provides the ```clearMetadataFromTag()``` method to clear tag values.  This leaves the empty tag in the image file so it can be written to again if necessary.  Like the ```writeMetadataToTag()``` method, this one also takes either a string or an array of strings as a parameter.  This is an **Async/Await** method.

```javascript
let exiftool = await new Exiftool().init('/path/to/image.jpg')
let tagToClear = '-IPTC:Contact^='
let result = await exiftool.clearMetadataFromTag(tagToClear)
console.log(result)
```

### Stripping Metadata From an Image
It is possible to strip all of the existing metadata from an image with this Exiftool package.  The default behavior of the original ```exiftool``` utility, when writing metadata to an image is to make a backup copy of the original image file.  The new file will keep the original file name, while the backup will have **_original** appended to the name.  Exiftool maintains this default behavior.

```javascript
let exiftool = await new Exiftool().init( '/path/to/image.jpg' )
let result = await exiftool.stripMetadata()
/*
  This will result in two files:
  - /path/to/image.jpg (contains no metadata in the file)
  - /path/to/image.jpg_original (contains all the original metadata)
*/
```

If you would like to change the default exiftool behavior, to overwrite the original image file, call the ```setOverwriteOriginal(<boolean>)``` method after the ```init()``` method.

```javascript
let exiftool = await new Exiftool().init('myPhoto.jpg')
exiftool.setOverwriteOriginal(true)
let result await exiftool.stripMetadata()
/*
  This will result in one file:
  - /path/to/myPhoto.jpg (contains no metadata in the file)
*/
```

If GPS location data is the only metadata that needs to be stripped, the ```stripLocation()``` method can be used.  This method updates the images in place.  It can be called on either a directory of images or a single image.  This is an **Async/Await** method.
```javascript
let exiftool = await new Exiftool().init('/path/to/images')
await exiftool.stripLocation()
// {
//   stdout: '    1 directories scanned\n    4 image files updated\n',
//   stderr: '',
//   exiftool_command: '/usr/local/bin/exiftool -gps:all= /path/to/images/'
// }
```

### Making Metadata Queries Directly
It may be more convenient sometimes to issue a metadata query to ```exiftool``` directly rather than compose it through the class configured default options and methods.  Running complex, one-off queries recursively across a directory of images might be a good use for issuing a command composed outside of Exiftool.  This is an **Async/Await** method.

```javascript
let exiftool = new Exiftool()
let result = await exiftool.raw('/usr/local/bin/exiftool b -jpgfromraw -w %d%f_%ue.jpg -execute -binary -previewimage -w %d%f_%ue.jpg -execute -tagsfromfile @ -srcfile %d%f_%ue.jpg -common_args --ext jpg /path/to/image/directory')
console.log(result)
```

### Setting File Extension for Exiftool to ignnore
Exiftool maintains a list of file extensions to tell ```exiftool``` to ignore when the target of the metadata query is a directory rather than a file.  This list of file extensions can be updated as necessary.  The ```setExtensionsToExclude()``` method may take two array parameters.  The first paramater is an array of file extensions to add to the exclude list.  The second paramater is an array of file extensions to remove from the current exclude list.

```javascript
let exiftool = new Exiftool()
console.log(exiftool.getExtensionsToExclude())
// [ 'cjs', 'css', 'html', 'js', 'json', 'md', 'mjs', 'txt' ]
const extensionsToAdd = ['scss','yaml']
const extensionsToRemove = ['txt']
exiftool.setExtensionsToExclude(extensionsToAdd, extensionsToRemove)
console.log(exiftool.getExtensionsToExclude())
// [ 'cjs', 'css', 'html', 'js', 'json', 'md', 'mjs', 'scss', 'yaml' ]
```
```javascript
// Just adding file extensions
exiftool.setExtensionsToExclude(extensionsToAdd)

// Just removing file extensions
exiftool.setExtensionsToExclude(null, extensionsToRemove)
```

### Exiftool Version and Location
Exiftool is [updated](https://exiftool.org/history.html) very frequently, so it might be useful to know which version is installed and being used by this package.  If a TAG is present in the image metadata, but not being returned in the query, the installed version of Exiftool might not know about it and need to be updated.  The install location and version of Exiftool are both queryable.  These are **Async/Await** methods.

```javascript
let exiftool = new Exiftool()
console.log(await exiftool.which())
// /usr/local/bin/exiftool
console.log(await exiftool.version())
// 12.46
```
