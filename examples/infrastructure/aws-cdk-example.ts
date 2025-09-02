#!/usr/bin/env node

/**
 * Infrastructure deployment integration example using AWS CDK with Mosaic Logger
 * This example demonstrates how to integrate the logger into AWS CDK infrastructure deployments
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

// Import Mosaic Logger (would be actual import in production)
// import { LoggerFactory } from '@mosaic/logger';

// Mock Mosaic Logger for CDK example
class MockInfrastructureLogger {
  private service: string;
  private environment: string;
  private emojis: boolean;
  private context: any;

  constructor(service: string, environment: string, emojis: boolean = false, context: any = {}) {
    this.service = service;
    this.environment = environment;
    this.emojis = emojis;
    this.context = context;
  }

  info(message: string, data: any = {}) {
    this._log('INFO', message, data);
  }

  error(message: string, data: any = {}) {
    this._log('ERROR', message, data);
  }

  warn(message: string, data: any = {}) {
    this._log('WARN', message, data);
  }

  debug(message: string, data: any = {}) {
    this._log('DEBUG', message, data);
  }

  private _log(level: string, message: string, data: any = {}) {
    const event = data.event || '';
    const emojiMap: { [key: string]: string } = {
      'INFRASTRUCTURE_DEPLOY': '🏗️',
      'SYSTEM_START': '🚀',
      'DATABASE_OPERATION': '💾',
      'ERROR_OCCURRED': '🐛',
      'WARNING_ISSUED': '⚠️',
      'CONFIG_CHANGE': '🔧',
      'PERFORMANCE_METRIC': '⚡',
      'SECURITY_EVENT': '🔐',
      'AUDIT_TRAIL': '📋'
    };

    const prefix = this.emojis && emojiMap[event] ? `${emojiMap[event]} ` : '';
    const correlationId = this.context.correlationId || 'N/A';
    
    console.log(`[${level}] [INFRA:${this.service}] ${prefix}${message} | correlation_id=${correlationId}`);
    
    if (data.error) {
      console.log(`  ERROR: ${data.error.type}: ${data.error.message}`);
    }
    
    if (data.metadata) {
      console.log(`  METADATA: ${JSON.stringify(data.metadata, null, 2)}`);
    }
    
    if (data.metrics) {
      console.log(`  METRICS: ${JSON.stringify(data.metrics, null, 2)}`);
    }
  }

  child(additionalContext: any) {
    return new MockInfrastructureLogger(
      this.service, 
      this.environment, 
      this.emojis, 
      { ...this.context, ...additionalContext }
    );
  }
}

class MockLoggerFactory {
  static createInfrastructureLogger(config: any) {
    return new MockInfrastructureLogger(
      config.stackName ? `infra-${config.stackName}` : 'infrastructure',
      config.environment,
      config.emojis || false,
      config.context || {}
    );
  }
}

/**
 * Mosaic Data Stack - demonstrates infrastructure logging
 */
export class MosaicDataStack extends cdk.Stack {
  private logger: MockInfrastructureLogger;
  private deploymentStartTime: number;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.deploymentStartTime = Date.now();
    
    // Initialize infrastructure logger
    this.logger = MockLoggerFactory.createInfrastructureLogger({
      stackName: 'mosaic-data-stack',
      environment: this.getEnvironment(),
      emojis: this.getEnvironment() === 'development',
      context: {
        stackId: this.stackId,
        stackName: this.stackName,
        region: this.region,
        account: this.account,
        correlationId: this.generateDeploymentId(),
        cdkVersion: this.getCdkVersion(),
        deploymentTrigger: process.env.DEPLOYMENT_TRIGGER || 'manual'
      }
    });

    this.logger.info(
      'Initiating Mosaic Data Stack deployment',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'deploy_stack',
          stackName: this.stackName,
          environment: this.getEnvironment(),
          estimatedResources: 8
        }
      }
    );

    // Deploy all resources
    this.deployResources();

    // Log deployment completion in constructor
    const deploymentDuration = Date.now() - this.deploymentStartTime;
    this.logger.info(
      'Mosaic Data Stack deployment completed',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'deploy_stack_complete',
          stackName: this.stackName,
          resourcesDeployed: this.getResourceCount()
        },
        metrics: {
          deploymentDurationMs: deploymentDuration
        }
      }
    );
  }

  private deployResources(): void {
    try {
      // Create DynamoDB table for projects
      const projectsTable = this.createProjectsTable();
      
      // Create S3 buckets for assets
      const assetsBucket = this.createAssetsBucket();
      const analyticsBucket = this.createAnalyticsBucket();
      
      // Create Lambda functions
      const apiLambda = this.createApiLambda(projectsTable, assetsBucket);
      
      // Create API Gateway
      const api = this.createApiGateway(apiLambda);
      
      // Create CloudWatch Log Groups
      this.createLogGroups();
      
      // Create IAM roles and policies
      this.createIamResources(projectsTable, assetsBucket);

      // Log resource dependencies
      this.logResourceDependencies({
        projectsTable,
        assetsBucket,
        analyticsBucket,
        apiLambda,
        api
      });

    } catch (error) {
      this.logger.error(
        'Stack deployment failed during resource creation',
        {
          event: 'ERROR_OCCURRED',
          error: {
            type: error.constructor.name,
            message: error.message,
            stack: error.stack
          },
          metadata: {
            operation: 'deploy_resources',
            stackName: this.stackName
          }
        }
      );
      throw error;
    }
  }

  private createProjectsTable(): dynamodb.Table {
    const tableLogger = this.logger.child({
      resource: 'dynamodb-projects-table',
      operation: 'create_table'
    });

    tableLogger.info(
      'Creating DynamoDB projects table',
      {
        event: 'DATABASE_OPERATION',
        metadata: {
          operation: 'create_dynamodb_table',
          tableName: 'Mosaic-Projects',
          billingMode: 'PAY_PER_REQUEST'
        }
      }
    );

    try {
      const table = new dynamodb.Table(this, 'ProjectsTable', {
        tableName: `Mosaic-Projects-${this.getEnvironment()}`,
        partitionKey: {
          name: 'PK',
          type: dynamodb.AttributeType.STRING
        },
        sortKey: {
          name: 'SK',
          type: dynamodb.AttributeType.STRING
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: this.getEnvironment() === 'production' 
          ? cdk.RemovalPolicy.RETAIN 
          : cdk.RemovalPolicy.DESTROY,
        pointInTimeRecovery: this.getEnvironment() === 'production',
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
      });

      // Add Global Secondary Index for user queries
      table.addGlobalSecondaryIndex({
        indexName: 'UserIndex',
        partitionKey: {
          name: 'UserId',
          type: dynamodb.AttributeType.STRING
        },
        sortKey: {
          name: 'CreatedAt',
          type: dynamodb.AttributeType.STRING
        }
      });

      tableLogger.info(
        'DynamoDB projects table created successfully',
        {
          event: 'DATABASE_OPERATION',
          metadata: {
            operation: 'create_table_complete',
            tableName: table.tableName,
            tableArn: table.tableArn,
            hasStream: true,
            gsiCount: 1
          }
        }
      );

      return table;

    } catch (error) {
      tableLogger.error(
        'Failed to create DynamoDB projects table',
        {
          event: 'ERROR_OCCURRED',
          error: {
            type: error.constructor.name,
            message: error.message
          },
          metadata: {
            operation: 'create_table_failed',
            resource: 'projects-table'
          }
        }
      );
      throw error;
    }
  }

  private createAssetsBucket(): s3.Bucket {
    const bucketLogger = this.logger.child({
      resource: 's3-assets-bucket',
      operation: 'create_bucket'
    });

    bucketLogger.info(
      'Creating S3 assets bucket',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_s3_bucket',
          bucketType: 'assets',
          encryption: 'AES256'
        }
      }
    );

    try {
      const bucket = new s3.Bucket(this, 'AssetsBucket', {
        bucketName: `mosaic-assets-${this.getEnvironment()}-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: this.getEnvironment() === 'production',
        removalPolicy: this.getEnvironment() === 'production' 
          ? cdk.RemovalPolicy.RETAIN 
          : cdk.RemovalPolicy.DESTROY,
        lifecycleRules: [
          {
            id: 'DeleteIncompleteMultipartUploads',
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(7)
          },
          {
            id: 'TransitionToIA',
            transitions: [
              {
                storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                transitionAfter: cdk.Duration.days(30)
              },
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: cdk.Duration.days(90)
              }
            ]
          }
        ]
      });

      // Add CORS configuration
      bucket.addCorsRule({
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'], // Configure appropriately for production
        allowedHeaders: ['*'],
        maxAge: 300
      });

      bucketLogger.info(
        'S3 assets bucket created successfully',
        {
          event: 'INFRASTRUCTURE_DEPLOY',
          metadata: {
            operation: 'create_bucket_complete',
            bucketName: bucket.bucketName,
            bucketArn: bucket.bucketArn,
            versioned: this.getEnvironment() === 'production',
            lifecycleRules: 2
          }
        }
      );

      return bucket;

    } catch (error) {
      bucketLogger.error(
        'Failed to create S3 assets bucket',
        {
          event: 'ERROR_OCCURRED',
          error: {
            type: error.constructor.name,
            message: error.message
          },
          metadata: {
            operation: 'create_bucket_failed',
            resource: 'assets-bucket'
          }
        }
      );
      throw error;
    }
  }

  private createAnalyticsBucket(): s3.Bucket {
    const bucketLogger = this.logger.child({
      resource: 's3-analytics-bucket',
      operation: 'create_analytics_bucket'
    });

    bucketLogger.info(
      'Creating S3 analytics bucket',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_analytics_bucket',
          purpose: 'data_lake',
          partitioning: 'date_based'
        }
      }
    );

    const bucket = new s3.Bucket(this, 'AnalyticsBucket', {
      bucketName: `mosaic-analytics-${this.getEnvironment()}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'AnalyticsDataLifecycle',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365)
            }
          ]
        }
      ]
    });

    bucketLogger.info(
      'S3 analytics bucket created successfully',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_analytics_bucket_complete',
          bucketName: bucket.bucketName,
          lifecycleTransitions: 3
        }
      }
    );

    return bucket;
  }

  private createApiLambda(table: dynamodb.Table, bucket: s3.Bucket): lambda.Function {
    const lambdaLogger = this.logger.child({
      resource: 'lambda-api-function',
      operation: 'create_lambda'
    });

    lambdaLogger.info(
      'Creating API Lambda function',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_lambda_function',
          runtime: 'nodejs18.x',
          architecture: 'arm64'
        }
      }
    );

    const lambdaFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `mosaic-api-${this.getEnvironment()}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('API request received:', JSON.stringify(event, null, 2));
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Mosaic API Lambda function' })
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        PROJECTS_TABLE_NAME: table.tableName,
        ASSETS_BUCKET_NAME: bucket.bucketName,
        ENVIRONMENT: this.getEnvironment(),
        LOG_LEVEL: this.getEnvironment() === 'production' ? 'INFO' : 'DEBUG'
      },
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    // Grant permissions
    table.grantReadWriteData(lambdaFunction);
    bucket.grantReadWrite(lambdaFunction);

    lambdaLogger.info(
      'API Lambda function created successfully',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_lambda_complete',
          functionName: lambdaFunction.functionName,
          functionArn: lambdaFunction.functionArn,
          runtime: 'nodejs18.x',
          memorySize: 512
        }
      }
    );

    return lambdaFunction;
  }

  private createApiGateway(lambdaFunction: lambda.Function): apigateway.RestApi {
    const apiLogger = this.logger.child({
      resource: 'api-gateway',
      operation: 'create_api'
    });

    apiLogger.info(
      'Creating API Gateway',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_api_gateway',
          type: 'REST_API'
        }
      }
    );

    const api = new apigateway.RestApi(this, 'MosaicApi', {
      restApiName: `mosaic-api-${this.getEnvironment()}`,
      description: 'Mosaic Platform API',
      deployOptions: {
        stageName: this.getEnvironment(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Correlation-Id']
      }
    });

    // Add Lambda integration
    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    
    // Add routes
    const projects = api.root.addResource('projects');
    projects.addMethod('GET', integration);
    projects.addMethod('POST', integration);
    
    const project = projects.addResource('{id}');
    project.addMethod('GET', integration);
    project.addMethod('PUT', integration);
    project.addMethod('DELETE', integration);

    apiLogger.info(
      'API Gateway created successfully',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_api_gateway_complete',
          apiId: api.restApiId,
          apiUrl: api.url,
          stage: this.getEnvironment(),
          endpoints: 5
        }
      }
    );

    return api;
  }

  private createLogGroups(): void {
    const logLogger = this.logger.child({
      resource: 'cloudwatch-logs',
      operation: 'create_log_groups'
    });

    logLogger.info(
      'Creating CloudWatch Log Groups',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_log_groups',
          retention: '1_WEEK'
        }
      }
    );

    // Application logs
    new logs.LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: `/mosaic/${this.getEnvironment()}/application`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Error logs
    new logs.LogGroup(this, 'ErrorLogGroup', {
      logGroupName: `/mosaic/${this.getEnvironment()}/errors`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    logLogger.info(
      'CloudWatch Log Groups created successfully',
      {
        event: 'INFRASTRUCTURE_DEPLOY',
        metadata: {
          operation: 'create_log_groups_complete',
          logGroups: 2
        }
      }
    );
  }

  private createIamResources(table: dynamodb.Table, bucket: s3.Bucket): void {
    const iamLogger = this.logger.child({
      resource: 'iam-resources',
      operation: 'create_iam'
    });

    iamLogger.info(
      'Creating IAM roles and policies',
      {
        event: 'SECURITY_EVENT',
        metadata: {
          operation: 'create_iam_resources',
          principle: 'least_privilege'
        }
      }
    );

    // Create user role for frontend access
    const userRole = new iam.Role(this, 'MosaicUserRole', {
      roleName: `MosaicUserRole-${this.getEnvironment()}`,
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com'),
      description: 'Role for authenticated Mosaic users'
    });

    // Grant limited access to resources
    userRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query'
      ],
      resources: [table.tableArn, `${table.tableArn}/index/*`],
      conditions: {
        'ForAllValues:StringEquals': {
          'dynamodb:LeadingKeys': ['${cognito-identity.amazonaws.com:sub}']
        }
      }
    }));

    iamLogger.info(
      'IAM resources created successfully',
      {
        event: 'SECURITY_EVENT',
        metadata: {
          operation: 'create_iam_complete',
          roles: 1,
          policies: 1
        }
      }
    );
  }

  private logResourceDependencies(resources: any): void {
    this.logger.info(
      'Resource dependencies established',
      {
        event: 'AUDIT_TRAIL',
        metadata: {
          operation: 'resource_dependencies',
          dependencies: {
            'lambda_to_dynamodb': 'read_write_access',
            'lambda_to_s3': 'read_write_access',
            'api_gateway_to_lambda': 'invoke_permission',
            'user_role_to_dynamodb': 'conditional_access'
          }
        }
      }
    );
  }

  private getEnvironment(): string {
    return process.env.CDK_ENV || 'development';
  }

  private getResourceCount(): number {
    // This would count actual resources in a real implementation
    return 8; // DynamoDB, 2 S3 buckets, Lambda, API Gateway, 2 Log Groups, IAM Role
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCdkVersion(): string {
    return '2.0.0'; // Would get actual version
  }
}

/**
 * CDK App with logging
 */
class MosaicApp extends cdk.App {
  private logger: MockInfrastructureLogger;

  constructor() {
    super();

    this.logger = MockLoggerFactory.createInfrastructureLogger({
      stackName: 'mosaic-app',
      environment: process.env.CDK_ENV || 'development',
      emojis: process.env.CDK_ENV !== 'production',
      context: {
        appName: 'mosaic-platform',
        version: '1.0.0',
        deploymentTrigger: process.env.DEPLOYMENT_TRIGGER || 'manual'
      }
    });

    this.logger.info(
      'Mosaic CDK Application initialization',
      {
        event: 'SYSTEM_START',
        metadata: {
          operation: 'cdk_app_init',
          environment: process.env.CDK_ENV || 'development',
          cdkVersion: '2.0.0'
        }
      }
    );

    // Create stacks
    new MosaicDataStack(this, 'MosaicDataStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
      }
    });

    this.logger.info(
      'Mosaic CDK Application setup complete',
      {
        event: 'SYSTEM_START',
        metadata: {
          operation: 'cdk_app_complete',
          stacks: 1,
          region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
        }
      }
    );
  }
}

// Bootstrap the application
const app = new MosaicApp();

// Export for testing
export { MosaicDataStack, MosaicApp };