# companion

Companion computer startup scripts and examples.

This repo is where you can contribute both feedback about (issues) and improvements to (PRs) ArduPilot companion computer support.


## Repo organisation

This repository is organized by board and then by OS. It follows the following structure:

```
Root
  |___Board1
  |     |___OS1
  |     |___OS2
  |
  |___Board2
  		|___OS1
  		|___OS2
```  
## Key links

* [Companion Computers](http://ardupilot.org/dev/docs/companion-computers.html) (Dev Wiki)
* [Gitter chat](https://gitter.im/ArduPilot/companion)


## Roadmap (always subject to change!)

2017-PRIME
  CUAV
  Allow flashing of firmware via APWeb
    Will require users to reflash their bootloader
  Get GPS accuracies into place
  TX1
    Base on JetPack 3.2
    Kernel patches for OpenKAI to work
    Kernel patches for serial to work
  Edison
    Attempt to fix USB OTG issue
    Fix Uptime entry in System Information APWeb tab

2017-PRIMEPRIME
  SmartShots
  APWeb to drop privs
  Multipe IMUs on system tab
  Reinstate Map tab
  Reinstate motor-test tab
  mavlink2 support
  parameters should be updated in parameters.html if we receive a param_value message

2017-PRIMEPRIMEPRIME
  Multi-Camera-Daemon
  Graph multiple sensors in Calibration screen
  OpenKAI

2018-?
  Support for returning password in system.html
    - requires TX1's Ubuntu to have an nmcli that supports -s properly


Ask people if they would update their bootloader
 - at the risk of needing JTAG to recover their boards
 - but with the possibility of updating their PixHawk over serial

