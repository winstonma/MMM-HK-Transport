# MMM-HK-Transport
<B>Station monitor</B> for the <B>Hong Kong Transport</B>.<P>

This module is an extension of the amazing [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror) project by [MichMich](https://github.com/MichMich/) which has inspired me to share my coding skills with others as well. Check it out, you know you want to :). <P>

It's always nice to see mirrors using my work, so feel free to send me some screenshots of your implementations.<P>

Lastly, why not join in on our discussions at the official [MagicMirror<sup>2</sup> Forum](http://forum.magicmirror.builders/)?

## Screenshots

`en`             |  `zh-tw` or `zh-hk`
:-------------------------:|:-------------------------:
![English version](screenshots/screenshot_en.png)  |  ![Chinese version](screenshots/screenshot_zh.png) |

## Current version

v1.3.0

## Languages
As of version 1.3.0, MMM-HK-Transport features language support for `Chinese (zh-hk and zh-tw)` and `English (en)` mirrors.

## Prerequisite
A working installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
 
## Dependencies
  * npm
  * [got](https://github.com/sindresorhus/got)

## Installation
Go to MagicMirror folder and execute the following command:
```
cd modules
git clone https://github.com/winstonma/MMM-HK-Transport.git
cd MMM-HK-Transport
npm install
```

## Module behavior
Please note that this module auto-creates a module header which displays the name of the chosen Hong Kong local transport stop. It is therefore recommended not to add a 'header' entry to your config.js for this module.<P>
This module automatically disappears from your mirror as soon as a station has stopped offering connections at night. It reappears as soon as your chosen station is scheduled to be served again.<P>
This module has been programmed to allow for multiple instances. Simply add more MMM-HK-Transport config entries to your config.js file to display multiple stations and configure them according to your needs.

## Configuration
Sample minimum configuration entry for your `~/MagicMirror/config/config.js`:

    ...
    
    {
        module: 'MMM-HK-Transport',
        position: 'top_left',
        config: {
            stops: [
                {
                    stopID: 'HKStop_KowloonCentralPostOffice_N_1'
                }
            ]
        }
    } 				// If this isn't your last module, add a comma after the bracket
    
    ...

Sample configuration entry for your `~/MagicMirror/config/config.js` with optional parameters:

    ...
    
    {
        module: 'MMM-HK-Transport',
        position: 'top_left',
        config: {
            stopID: 'HKStop_KowloonCentralPostOffice_N_1',
            showLabelRow: true, // Show or hide column headers
            reloadInterval: 60000 	// How often should the information be updated? (In milliseconds)
        }
    } 						// If this isn't your last module, add a comma after the bracket
    
    ...

## Figuring out the correct stopID
1. Open your web browser and navigate to the [CityMapper Hong Kong Web Page](https://citymapper.com/hong-kong).
2. Go to `LINES` search box enter the bus line number.
3. Once you can see the stop in your browser, click the stop.
4. When a new page is being displayed, check the link (e.g. https://citymapper.com/hong-kong/bus/stops/HKStop_KowloonCentralPostOffice_N_1). Note the last portion of the link (e.g. `HKStop_KowloonCentralPostOffice_N_1`)is the `StopID` you are looking for.

## Config Options
| **Option** | **Default** | **Description** |
| :---: | :---: | --- |
| stopID | HKStop_KowloonCentralPostOffice_N_1 | <BR>Which stop would you like to have displayed? <BR><EM> Default: HKStop_KowloonCentralPostOffice_N_1</EM><P> |
| showLabelRow<BR>`optional` | true | <BR> Show or hide column headers<BR> <EM>Possible values: true, false</EM><P> |
| reloadInterval<BR>`optional`  | 60000 | <BR> How often should the information be updated? (In milliseconds) <BR><EM> Default: Every minute </EM><P> |
