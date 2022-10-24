# Extract Image Metadata with Exiftool

This package for Node.js provides an object oriented wrapper around the phenomenal utility, [exiftool](https://exiftool.org), created by [Phil Harvey](https://exiftool.org/index.html#donate).  This package requires the ```exiftool``` perl library to already be installed.  Installation instructions can be found [here](https://exiftool.org/install.html).  This package is compatible with POSIX systems; it will not work on a Windows machine.  This package will not run in a browser.

<!-- ## Package Installation
```bash
npm install @mattduffy/exiftool
``` -->

## Using Exiftool
This package attempts to abastract the various uses of exiftool into a small collection of distinct methods that help to reduce the difficulty of composing complex metadata processing incantations.  The Exiftool class instantiates with a reasonable set of default options to produce explicitly labeled, yet compact, metadata output in JSON format.  The included options are easily modified if necessary, and even more customized exiftool incantations can be created and saved as [shortcuts](https://exiftool.org/TagNames/Shortcuts.html) in an [exiftool.config](https://exiftool.org/config.html) file.  

```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = new Exiftool()
```

The Exiftool class constructor does most of the initial setup.  A call to the ```init()``` method is currently necessary to complete setup because it makes some asynchronous calls to determine the location of exiftool, whether the exiftool.config file is present - creating one if not, and composing the exiftool command string from the default options.  The ```init()``` method takes a string parameter which is the file system path to an image file or a directory of images.  This is an **Async/Await** method.
```javascript
exiftool = await exiftool.init( '/www/site/images/myNicePhoto.jpg' )
```

At this point, Exiftool is ready to extract metadata from the image ```myNicePhoto.jpg```.  Use the ```getMetadata()``` to extract the metadata.    This is an **Async/Await** method.  

There are a few options to choose what metadata is extracted from the file:
- using default options, including a pre-configured shortcut
- override the default shortcut name with a different one (already added to the exiftool.config file)
- adding additional [Exiftool Tags](https://exiftool.org/TagNames/index.html) to extract beyound those included in the default shortcut

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
let metadata4 = await exiftool.getMetadata( '', '', 'EXIF:LensInfo EXIF:FocalLength File:ImageWidth File:ImageHeight' )

// All three parameters can be used at once if desired.
let metadata5 = await exiftool.getMetadata( '/path/to/a/different/image.jpg', 'ADifferentSavedShortcut', 'EXIF:LensInfo EXIF:FocalLength File:ImageWidth File:ImageHeight' )
```

The simplest use of Exiftool looks like this:
 ```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = new Exiftool()
exiftool = await exiftool.init( 'images/copper.jpg' )
let metadata = await exiftool.getMetadata()
 console.log( metatdata )
 [
  {
    SourceFile: 'images/copper.jpg',
    'File:FileName': 'copper.jpg',
    'EXIF:ImageDescription': 'Copper curtain fixture',
    'IPTC:ObjectName': 'Tiny copper curtain rod',
    'IPTC:Caption-Abstract': 'Copper curtain fixture',
    'IPTC:Keywords': 'copper curtain fixture',
    'Composite:GPSPosition': '36.195406 N, 122.208642 W'
  },
  exiftool_command: '/usr/local/bin/exiftool -config /home/node_packages/exiftool/exiftool.config -json -c "%.6f" -BasicShortcut -G -s3 -q --ext TXT --ext JS --ext JSON --ext MJS --ext CJS --ext MD --ext HTML images/copper.jpg'
]
 ```
The ```exiftool_command``` property is the command composed from all the default options, using the pre-configured BasicShortcut saved in the exiftool.config file.

Because ```exiftool``` is such a well designed utility, it naturally handles metadata queries to directories just as easily as to a specific image file.  It will automatically recurse through a directory and process any image file types that it knows about.  Exiftool is designed with this in mind, by setting a default list of file types to exclude, including TXT, JS, CJS, MJS, JSON, MD, HTML, and CSS.  This behavior can be altered by modifying the ```_opts.excludeTypes``` class property.

```javascript
import { Exiftool } from '@mattduffy/exiftool'
let exiftool = new Exiftool()
exiftool = await exiftool.init( 'images/' )
let metadata = await exiftool.getMetadata()
 console.log( metatdata )
[
  {
    SourceFile: 'images/IMG_1820.heic',
    'File:FileName': 'IMG_1820.heic',
    'Composite:GPSPosition': '22.531478 N, 81.907106 W'
  },
  {
    SourceFile: 'images/copper.jpg',
    'File:FileName': 'copper.jpg',
    'EXIF:ImageDescription': 'Copper curtain fixture',
    'IPTC:ObjectName': 'Tiny copper curtain rod',
    'IPTC:Caption-Abstract': 'Copper curtain fixture',
    'IPTC:Keywords': 'copper curtain fixture',
    'Composite:GPSPosition': '36.195406 N, 122.208642 W'
  },
  {
    SourceFile: 'images/IMG_1820.jpg',
    'File:FileName': 'IMG_1820.jpg',
    'Composite:GPSPosition': '22.531478 N, 81.907106 W'
  },
  {
    exiftool_command: '/usr/local/bin/exiftool -config /home/node_package_development/exiftool/exiftool.config -json -c "%.6f"  -BasicShortcut -G -s3 -q --ext TXT --ext JS  --ext JSON  --ext MJS --ext CJS --ext MD --ext HTML images/'
  }
]
```

### The exiftool.config file
This file is not required to be present to process metadata by the original ```exiftool```, but it can help a lot with complex queries, so this Exiftool package uses it.  During the ```init()``` setup, a check is performed to see if the file is present in the root of the package directory.  If no file is found, a very basic file is created, populated with a simple shortcut called ```BasicShortcut```.  The path to this file can be overridden to use a different file.

```javascript
let exiftool = new Exiftool()
exiftool = await exiftool.init( '/path/to/image.jpg' )
exiftool.setConfigPath( '/path/to/new/exiftool.config' )
let metadata = await exiftool.getMetadata()
```

### Shortcuts
The original ```exiftool``` provides a very convenient way to save arbitrarily complex metadata queries in the form of **shortcuts** saved in an ```exiftool.config``` file.  New shortcuts can be added to the ```exiftool.config``` managed by the package.  If a different ```exiftool.config``` file is used, do not try to save new shortcuts to that file with this method.  To add a new shortcut, use ```addShortcut()```.  This is an **Async/Await** method.

```javascript
let exiftool = new Exiftool()
exiftool = await exiftool.init( '/path/to/image.jpg' )
// Check to see if a shortcut with this name is already 
// present in the package provided exiftool.config file
if (!await exiftool.hasShortcut( 'MyCoolShortcut' )) {
  // Shortcut was not found, save the shortcut definition to the exiftool.config file
  let result = await exiftool.addShortcut( "MyCoolShortcut => ['EXIF:LensInfo EXIF:FocalLength File:ImageWidth File:ImageHeight']" )
  console.log( result )
}
```
To change the default shortcut (BasicShortcut) to something else, that has already been added to the ```exiftool.config``` file, use the ```setShortcut()``` method.

```javascript
let exiftool = new Exiftool()
exiftool = await exiftool.init( '/path/to/image.jpg' )
let result = exiftool.setShortcut( 'MyCoolShortcut' )
let metadata = await exiftool.getMetadata()

// Alternatively, pass the shortcut name as a parameter in the getMetadata() method
let metadata = await exiftool.getMetadata( '', 'MyCoolShortcut', '' )
```

To remove a shortcut from the package provided ```exiftool.config``` file use the ```removeShortcut()``` method.  This is an **Async/Await** method.

```javascript
let exiftool = new Exiftool()
exiftool = await exiftool.init( '/path/to/image.jpg' )
// Check to see if a shortcut with this name is already 
// present in the package provided exiftool.config file
if (await exiftool.hasShortcut( 'MyCoolShortcut' )) {
  // Shortcut was found, now remove it
  let result = await exiftool.removeShortcut( 'MyCoolShortcut' )
  console.log( result )
}
```

Exiftool creates a backup of the ```exiftool.config``` file each time it is modified by the ```addShortcut()``` or ```removeShortcut()``` methods.

### Stripping Metadata From an Image
It is possible to strip all of the existing metadata from an image with this Exiftool package.  The default behavior of the original ```exiftool``` utility, when writing metadata to an image is to make a backup copy of the original image file.  The new file will keep the original file name, while the backup will have **_original** appended to the name.  Exiftool maintains this default behavior.

```javascript
let exiftool = new Exiftool()
exiftool = await exiftool.init( '/path/to/image.jpg' )
let result = await exiftool.stripMetadata()
/*
  This will result in two files:
  - /path/to/image.jpg (contains no metadata in the file)
  - /path/to/image.jpg_original (contains all the original metadata)
*/
```

