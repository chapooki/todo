import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apiGW from '@aws-cdk/aws-apigatewayv2'
import * as apiGWi from '@aws-cdk/aws-apigatewayv2-integrations'

export class TodoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'todoTable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new cdk.CfnOutput(this, 'todo-Table-Name', {value: table.tableName});
    new cdk.CfnOutput(this, 'todo-Table-arn', {value: table.tableArn});

    const postFunction = new lambdaNode.NodejsFunction(this, 'PostFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      // name of the exported function
      handler: 'post',
      // file to use as entry point for our Lambda function
      entry: __dirname + '/../lambda/lib/tasks.ts',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    // Grant full access to the data
    table.grantReadWriteData(postFunction);
    
    const getFunction = new lambdaNode.NodejsFunction(this, 'GetFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'get',
      entry: __dirname + '/../lambda/lib/tasks.ts',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    // Grant only read access for this function
    table.grantReadData(getFunction);

    const api = new apiGW.HttpApi(this, 'Api');
    new cdk.CfnOutput(this, 'ApiUrl', {value: api.url!});

    api.addRoutes({
      path: '/tasks',
      methods: [apiGW.HttpMethod.POST],
      integration: new apiGWi.LambdaProxyIntegration({handler: postFunction})
    });
    api.addRoutes({
      path: '/tasks',
      methods: [apiGW.HttpMethod.GET],
      integration: new apiGWi.LambdaProxyIntegration({handler: getFunction})
    });
  }
}
