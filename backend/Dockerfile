# ─────────────────────────────────────────────────
# Stage 1 — Build: compile the Spring Boot fat JAR
# ─────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom first (layer-cache the dependency download)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Pre-download all dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy the full source and build — skip tests (tests need a live DB)
COPY src ./src
RUN ./mvnw package -DskipTests -B

# ─────────────────────────────────────────────────
# Stage 2 — Runtime: only the JRE + the fat JAR
# ─────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S patientbook && adduser -S patientbook -G patientbook

# Copy only the compiled JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Give ownership to the non-root user
RUN chown patientbook:patientbook app.jar
USER patientbook

# Spring Boot runs on port 8086 (matches application.properties)
EXPOSE 8086

# Use the 'docker' Spring profile so it reads application-docker.properties
ENTRYPOINT ["java", "-Dspring.profiles.active=docker", "-jar", "app.jar"]
