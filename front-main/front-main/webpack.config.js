const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const { API_URL, PORT } = process.env;
console.log('PORT', PORT);
console.log('API_URL', API_URL);


module.exports = {
    // Точку входа для сборки дерева модулей
    entry: "./src/index.js",

    // Webpack будет собирать все файлы в bundle.js
    output: {
        clean: true,
        filename: "bundle.[contenthash:12].js",
        chunkFilename: "chunk.[id].[contenthash:12].js",
        // Путь к папке, в которой будет находиться bundle.js
        path: path.resolve(__dirname, './build'),
        publicPath: '/'
    },

    // Работа с модулями
    module: {
        // Определяем правила для обработки файлов
        rules: [
            {
                // Регулярное выражение для обработки файлов с расширениями .js и .mjs
                test: /\.m?js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                options: {
                    /* Пресеты для преобразования кода:
                     * @babel/preset-env - преобразование JS
                     * @babel/preset-react - преобразование JSX
                     * */
                    presets: ['@babel/preset-env', "@babel/preset-react"],
                }
            },

            /* Interesting CSS and CSS Modules */
            {
                // Регулярное выражение для обработки файлов с расширениями .css и .scss
                test: /\.(css|scss)$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: {
                                localIdentName: "[name]__[local]___[hash:base64:5]",
                            },
                        }
                    }
                ],
                // Применяем это правило только к файлам с .module.css в имени
                include: /\.module\.css$/
            },
            {
                test: /\.(css|scss)$/,
                use: [
                    'style-loader',
                    'css-loader'
                ],
                // Исключаем файлы с .module.css в имени
                exclude: /\.module\.css$/
            },


            {
                // Регулярное выражение для обработки файлов с расширением векторных файлов с расширением .svg
                test: /\.svg$/,
                use: ['@svgr/webpack'],
            },

            {
                // Регулярное выражение для обработки изображений с расширением .png и .jpeg/.jpg
                test: /\.(png|jpe?g)$/i,
                use: [
                    {
                        loader: 'file-loader'
                    }
                ]
            },

        ]
    },

    // Подключаем плагины
    plugins: [
        { apply(compiler) {
            compiler.hooks.thisCompilation.tap('CondPublicAssets', compilation => {
                compilation.hooks.processAssets.tap({ name: 'CondPublicAssets', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, () => {
                    const files = ['manifest.webmanifest', 'cond-icon.svg', 'cond-icon-180.png', 'cond-icon-192.png', 'cond-icon-512.png', ...(process.env.LOCAL_DEMO !== 'false' ? ['phone-preview.html','presentation.html','owner-questions.html'] : [])];
                    const productDir=path.join(__dirname,'public/products');
                    if(require('fs').existsSync(productDir))for(const file of require('fs').readdirSync(productDir))if(/\.(png|jpe?g|webp)$/i.test(file))files.push('products/'+file);
                    for (const file of files) compilation.emitAsset(file, new compiler.webpack.sources.RawSource(require('fs').readFileSync(path.join(__dirname, 'public', file))));
                });
                compilation.hooks.processAssets.tap({ name: 'CondOfflineShell', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE }, () => {
                    const optionalPhotos = new Set([...compilation.chunks].filter(chunk => [...compilation.chunkGraph.getChunkModulesIterable(chunk)].some(module => String(module.resource||'').replace(/\\/g,'/').includes('/heic2any/'))).flatMap(chunk => [...chunk.files]));
                    const assets = Object.keys(compilation.assets).filter(n => !optionalPhotos.has(n) && /\.(html|js|css|svg|png|jpe?g|webmanifest)$/.test(n)).map(n => '/' + n);
                    const template = require('fs').readFileSync(path.join(__dirname, 'public/sw.js'), 'utf8');
                    const hash = require('crypto').createHash('sha256').update(template+assets.map(n => compilation.assets[n.slice(1)].source()).join('')).digest('hex').slice(0, 16);
                    const source = template.replace('__BUILD__', hash).replace('__ASSETS__', JSON.stringify(assets));
                    compilation.emitAsset('sw.js', new compiler.webpack.sources.RawSource(source));
                });
            });
        } },
        new Dotenv({ systemvars: true }),

        // Создаем entry HTML-файл на основе шаблона и подключаем в него bundle.js
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        }),
    ],

    // Настройки webpack-dev-back
    devServer: {
        host: '127.0.0.1',
        proxy: { '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true } },
        compress: true, // Сжатие для всех исходящих данных
        port: PORT || 9000, // Порт, на котором будет работать сервер
        allowedHosts: "all", // Позволяет принимать запросы со всех IP
        // Прокси - перенаправление запросов
        historyApiFallback: true, // Входит через index.html и дальше маршрутизируется ('/any' теперь работает).
        // proxy: [
        //     {
        //         context: ['/'], // Перенаправляем все запросы, начинающиеся с /api
        //         target: API_URL || 'http://localhost:3000', // Целевой сервер для прокси
        //         // changeOrigin: true,
        //         // "secure": false, // Проверку SSL сертификата
        //     }
        // ],
    }
};
