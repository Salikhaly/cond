const bcrypt = require("bcrypt");

bcrypt.hash('super', 3).then( r => console.log(r))
