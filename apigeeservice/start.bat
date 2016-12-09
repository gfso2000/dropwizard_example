@ECHO OFF
SET "JAVA_HOME=C:\sapjvm_7_8_32"
echo JAVA_HOME: %JAVA_HOME%
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=8000 -jar target/apigeeservice-1.0-SNAPSHOT.jar server apigee.yml
