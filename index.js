const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const app = require("./src/app");
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
};

mongoose.Promise = global.Promise;

mongoose
  .connect(`mongodb://127.0.0.1:27017/Twitter`, options)
  .then(() => {
    console.log(`Conectado con la base de datos)`);
    app.listen(port, () => console.log(`Corriendo servidor express)`));
  })
  .catch((err) => console.error(err));
