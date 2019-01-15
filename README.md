# Blockly.IO

This is a clone of the original Paper-IO released by Voodoo, except for one aspect. This will attempt to implement a multi-player aspect of the game (like a real IO game). Currently this has a playground at this [link](https://thekidofarcrania.github.io/BlocklyIO). It's a demo version of what to come. Hopefully by that time, the necessary server infrastructure could be obtained.

This is just a fun side-project for me. If you would want to use this code, it would be nice to let me know.



## Running

After cloning this repository, run the follow commands to install dependencies and set up server. Enjoy!

```bash
npm install
npm start
```

### Creating bundle.js
To create the `public/bundle.js` file, you probably need to run something like the following commands:
```bash
sudo npm install browserify -g
browserify game-client.js > public/bundle.js
```

Or something like that. 


## License

This is licensed under MIT. As such, please provide due credit and link back to this repository if possible.
