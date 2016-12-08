package com.sap.sf;

import com.sap.sf.resources.ApigeeResource;

import io.dropwizard.Application;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;

public class ApigeeApplication extends Application<ApigeeConfiguration> {

    public static void main(final String[] args) throws Exception {
        new ApigeeApplication().run(args);
    }

    @Override
    public String getName() {
        return "Apigee";
    }

    @Override
    public void initialize(final Bootstrap<ApigeeConfiguration> bootstrap) {
        // TODO: application initialization
    }

    @Override
    public void run(final ApigeeConfiguration configuration,
                    final Environment environment) {
      final ApigeeResource resource = new ApigeeResource(
          configuration.getTemplate(),
          configuration.getDefaultName()
      );
      environment.jersey().register(resource);
    }

}
