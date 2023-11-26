# @njfiorello/tiny-cm
![Last commit](https://img.shields.io/github/last-commit/melgish/tiny-cm)
![Build Status](https://github.com/melgish/tiny-cm/workflows/build/badge.svg)
[![Coverage](https://codecov.io/gh/melgish/tiny-cm/branch/main/graph/badge.svg?token=40H9P8IZRC)](https://codecov.io/gh/melgish/tiny-cm)
![Dependencies](https://david-dm.org/melgish/tiny-cm.svg)
![Dev Dependencies](https://david-dm.org/melgish/tiny-cm/dev-status.svg)
[![License](https://shields.io/github/license/melgish/tiny-cm)](./LICENSE)

Warning: Use only for testing

## Installation

Run npm install to install dependencies

`npm install`

## Running

Run npm start to launch service

`npm start`

## Development

Run npm test to run via ts-node

`npm test`

## Configuration

The following envrionment variables are avalable to control application behavior.

| Name                | Default   | Description                    |
| ------------------- | --------- | ------------------------------ |
| HTTP_PORT           | 3000      | Listen port.                   |
| DATA_ROOT           | /app/data | Folder where data is saved.    |
| SAVE_SECONDS        | 60        | Max delay before save to disk. |
| REQUESTS_PER_MINUTE | 60        | Configures rate limiting.      |
