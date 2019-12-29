# Overview

A Chrome extension to show country flags on each product in Amazon.

# License

This project is licensed under the terms of the Apache 2.0 license. See `LICENSE`.

# Usage
Install from chrome web store.

# Development
## Setup
Install dependent packages
```console
npm install
```

## Unit test
Run test and report coverage 
```console
npm run build
npm run test
```

## Test via SAM in your test account
Configure AWS account information for SAM deployment
```console
npm run setup
# you will be asked for credentials
```

Configure bucket for uploading SAM package. The bucket needs to be configured as described [here](https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-publish.html#publishing-application-through-aws-console).
```console
npm config set dynamodb-history-storer:bucket YOUR_BUCKET_NAME
```

Build SAM package
```console
npm run package
```

Deploy SAM package for test
```console
npm run deploy
```

Delete stack for SAM package
```console
npm run delete-stack
```

## Publish your application
Publish application to Serverless Application Repository
```console
npm run publish
```