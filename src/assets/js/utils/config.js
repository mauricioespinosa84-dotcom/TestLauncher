/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const pkg = require('../package.json');
const nodeFetch = require("node-fetch");
const convert = require('xml-js');
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

let config = `${url}/config`;
let articles = `${url}/articles`;

async function fetchJsonWithFallback(baseUrl) {
    let res = null;
    try {
        res = await nodeFetch(baseUrl);
        if (res.status === 200) return await res.json();
    } catch (error) {
        res = null;
    }

    try {
        res = await nodeFetch(`${baseUrl}.json`);
        if (res.status === 200) return await res.json();
    } catch (error) {
        res = null;
    }

    let code = res?.statusText || 'server not accessible';
    throw { code, message: 'server not accessible' };
}

class Config {
    GetConfig() {
        return new Promise((resolve, reject) => {
            fetchJsonWithFallback(config).then(data => {
                resolve(data);
            }).catch(error => {
                return reject({ error: { code: error.code, message: error.message } });
            });
        })
    }

    async getInstanceList() {
        let urlInstance = `${url}/instances`
        let instances = await fetchJsonWithFallback(urlInstance).catch(err => err)
        let instancesList = []
        instances = Object.entries(instances)

        for (let [name, data] of instances) {
            let instance = data
            instancesList.push(instance)
        }
        return instancesList
    }

    async getNews(config) {
        if (config.rss) {
            return new Promise((resolve, reject) => {
                nodeFetch(config.rss).then(async config => {
                    if (config.status === 200) {
                        let news = [];
                        let response = await config.text()
                        response = (JSON.parse(convert.xml2json(response, { compact: true })))?.rss?.channel?.item;

                        if (!Array.isArray(response)) response = [response];
                        for (let item of response) {
                            news.push({
                                title: item.title._text,
                                content: item['content:encoded']._text,
                                author: item['dc:creator']._text,
                                publish_date: item.pubDate._text
                            })
                        }
                        return resolve(news);
                    }
                    else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
                }).catch(error => reject({ error }))
            })
        } else {
            return new Promise((resolve, reject) => {
                fetchJsonWithFallback(articles).then(data => {
                    resolve(data);
                }).catch(error => {
                    return reject({ error: { code: error.code, message: error.message } });
                });
            })
        }
    }
}

export default new Config;
