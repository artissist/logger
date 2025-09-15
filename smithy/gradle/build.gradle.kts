plugins {
    id("software.amazon.smithy") version "0.7.0"
}

repositories {
    mavenLocal()
    mavenCentral()
}

buildscript {
    dependencies {
        classpath("software.amazon.smithy:smithy-cli:1.47.0")
    }
}

dependencies {
    // Core Smithy dependencies
    smithyBuild("software.amazon.smithy:smithy-model:1.47.0")
    smithyBuild("software.amazon.smithy:smithy-aws-traits:1.47.0")

    // Code generation dependencies
    smithyBuild("software.amazon.smithy:smithy-typescript-codegen:0.20.0")
    smithyBuild("software.amazon.smithy:smithy-python-codegen:0.1.0")

    // OpenAPI generation
    smithyBuild("software.amazon.smithy:smithy-openapi:1.47.0")

    // Validation and linting
    smithyBuild("software.amazon.smithy:smithy-linters:1.47.0")
    smithyBuild("software.amazon.smithy:smithy-diff:1.47.0")
}

configure<software.amazon.smithy.gradle.SmithyExtension> {
    // Output directory for generated code
    outputDirectory = file("${project.projectDir}/../generated")

    // Fork Smithy CLI process
    fork = false

    // Additional arguments for Smithy CLI
    // smithyBuildConfigs = files("smithy-build.json")
}

tasks {
    // Custom task to clean generated code
    register("cleanGenerated") {
        group = "build"
        description = "Cleans generated code directory"
        doLast {
            delete("${project.projectDir}/../generated")
        }
    }

    // Custom task to generate TypeScript client
    register("generateTypeScript") {
        group = "codegen"
        description = "Generates TypeScript client code"
        dependsOn("smithyBuild")
        doLast {
            println("TypeScript client generated in ../generated/typescript")
        }
    }

    // Custom task to generate Python client
    register("generatePython") {
        group = "codegen"
        description = "Generates Python client code"
        dependsOn("smithyBuild")
        doLast {
            println("Python client generated in ../generated/python")
        }
    }

    // Custom task to generate all clients
    register("generateAll") {
        group = "codegen"
        description = "Generates all client code (TypeScript, Python, OpenAPI docs)"
        dependsOn("generateTypeScript", "generatePython")
    }

    // Clean before build
    named("build") {
        dependsOn("cleanGenerated")
    }

    // Validate models before generation
    named("smithyBuild") {
        dependsOn("smithyValidate")
    }
}
