plugins {
    id("software.amazon.smithy") version "0.7.0"
}

repositories {
    mavenCentral()
}

// Configure the output directory for generated code
configure<software.amazon.smithy.gradle.SmithyExtension> {
    outputDirectory = file("${project.projectDir}/../generated")
}
