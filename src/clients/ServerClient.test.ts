import ServerClient from './ServerClient';

it('Has correct API version', () => {
    const packageJson = require('../../package.json');
    const apiVersion = packageJson.tgs_api_version;

    const apiHeader = ServerClient.getApiVersion();

    expect(apiHeader).toBe(`Tgstation.Server.Api/${apiVersion}`);
});

it('Has correct User-Agent', () => {
    const packageJson = require('../../package.json');
    const packageName = packageJson.name;
    const version = packageJson.version;

    const trueUserAgent = `${packageName}/${version}`;

    expect(ServerClient.getUserAgent()).toBe(trueUserAgent);
});
