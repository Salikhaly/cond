const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads')); // Папка для сохранения изображений
    },
    filename: function (req, file, cb) {
        // Уникальное имя файла
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });
// const upload = multer({
//     dest: path.join(__dirname, 'storage/uploads') // Убедитесь, что этот путь правильный
// });

module.exports = upload
