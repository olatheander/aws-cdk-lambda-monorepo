import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  LambdaRestApi,
  Cors,
  LambdaIntegration,
  PassthroughBehavior,
} from "aws-cdk-lib/aws-apigateway";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc");

    const lambdaHandler = new NodejsFunction(this, "jobstream-poll-lambda", {
      memorySize: 1024,
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_14_X,
      handler: "main",
      entry: path.join(__dirname, `../src/index.ts`),
      vpc,
      environment: {},
    });

    const lambdaApi = new LambdaRestApi(this, "hello-api", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      handler: lambdaHandler,
      proxy: false,
    });

    const lambdaIntegration = new LambdaIntegration(lambdaHandler, {
      proxy: false,
      requestParameters: {
        "integration.request.querystring.name":
          "method.request.querystring.name",
      },
      requestTemplates: {
        "application/json": JSON.stringify({
          name: "$util.escapeJavaScript($input.params('name'))",
          stage: "$context.stage",
          request_id: "$context.requestId",
          api_id: "$context.apiId",
          resource_path: "$context.resourcePath",
          resource_id: "$context.resourceId",
          http_method: "$context.httpMethod",
          source_ip: "$context.identity.sourceIp",
          user_agent: "$context.identity.userAgent",
          account_id: "$context.identity.accountId",
          api_key: "$context.identity.apiKey",
          caller: "$context.identity.caller",
          user_name: "$context.authorizer.claims['cognito:username']",
          user_id: "$context.authorizer.claims['sub']",
        }),
      },
      passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            // We can map response parameters
            // - Destination parameters (the key) are the response parameters (used in mappings)
            // - Source parameters (the value) are the integration response parameters or expressions
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
        },
        {
          // For errors, we check if the error message is not empty, get the error data
          selectionPattern: "(\n|.)+",
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
        },
      ],
    });

    const helloAPI = lambdaApi.root.addResource("hello");
    // GET /hello
    helloAPI.addMethod("GET", lambdaIntegration, {
      requestParameters: {
        "method.request.querystring.name": true, //true = required
      },
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });
  }
}
