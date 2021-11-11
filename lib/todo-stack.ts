import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apiGW from '@aws-cdk/aws-apigateway'
import * as path from 'path';
// import * as apiGWi from '@aws-cdk/aws-apigatewayv2-integrations'

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


    // const miscLayer = new lambda.LayerVersion(this, 'misc-layer', {
    //   compatibleRuntimes: [
    //     lambda.Runtime.NODEJS_12_X,
    //     lambda.Runtime.NODEJS_14_X,
    //   ],
    //   code: lambda.Code.fromAsset('../src/layer/misc'),
    //   description: 'all misc packages',
    // });

    const postFunction = new lambdaNode.NodejsFunction(this, 'PostFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      // name of the exported function
      handler: 'post',
      // file to use as entry point for our Lambda function
      entry: path.join(__dirname + '/../src/lambda/lib/tasks.ts'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      // layers: [miscLayer]
    });
    // Grant full access to the data
    table.grantReadWriteData(postFunction);
    
    const getFunction = new lambdaNode.NodejsFunction(this, 'GetFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'get',
      entry: path.join(__dirname + '/../src/lambda/lib/tasks.ts'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      // layers: [miscLayer]
    });
    // Grant only read access for this function
    table.grantReadData(getFunction);

    // const api = new apiGW.HttpApi(this, 'Api');
    // new cdk.CfnOutput(this, 'ApiUrl', {value: api.url!});

    // api.addRoutes({
    //   path: '/tasks',
    //   methods: [apiGW.HttpMethod.POST],
    //   integration: new apiGWi.LambdaProxyIntegration({handler: postFunction})
    // });
    // api.addRoutes({
    //   path: '/tasks',
    //   methods: [apiGW.HttpMethod.GET],
    //   integration: new apiGWi.LambdaProxyIntegration({handler: getFunction})
    // });

    const api = new apiGW.RestApi(this, 'api', {
      description: 'todo list api gateway',
      deployOptions:{
        stageName: 'dev'
      }
    });
    new cdk.CfnOutput(this, 'apiUrl', {value: api.url});

    // 👇 add a /todos resource
    const todos = api.root.addResource('todos');

    todos.addMethod(
      'GET',
      new apiGW.LambdaIntegration(getFunction, { proxy: true }));
    todos.addMethod(
      'POST',
      new apiGW.LambdaIntegration(postFunction, { proxy: true }));
  }
}
