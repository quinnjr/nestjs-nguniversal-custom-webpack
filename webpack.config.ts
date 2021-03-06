import { join } from 'path';
import { Configuration, DefinePlugin, IgnorePlugin } from 'webpack';
import {
  CustomWebpackBrowserSchema,
  TargetOptions
} from '@angular-builders/custom-webpack';
import DotenvPlugin from 'dotenv-webpack';
import nodeExternals from 'webpack-node-externals';
import TerserPlugin from 'terser-webpack-plugin';
import * as pkg from './package.json';

export default (
  config: Configuration,
  _options: CustomWebpackBrowserSchema,
  targetOptions: TargetOptions
) => {

  config.output?.crossOriginLoading = 'anonymous';

  config.plugins?.push(
    new DotenvPlugin({
      safe: true,
      allowEmptyValues: false,
      systemvars: true
    }),
    new DefinePlugin({
      APP_NAME: pkg.name,
      APP_VERSION: pkg.version
    })
  );

  config.cache = {
    type: 'filesystem',
    allowCollectingMemory: true,
    hashAlgorithm: 'md5'
  };

  if (targetOptions.target === 'browser') {
    config.module?.rules?.push(
      {
        test: /\.(eot|svg|ttf|woff2?)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '/assets/webfonts/[name].[ext]'
          }
        }
      },
      {
        test: /\.wasm$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '/wasm/[name].[ext]'
          }
        },
        type: 'javascript/auto'
      }
    );
  }

  if (targetOptions.target === 'server') {
    config.resolve?.extensions?.push('.mjs', '.graphql', '.gql');

    config.module?.rules?.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto'
    });

    config.externalsPresets = { node: true };

    (config.externals as Array<any>).push(
      nodeExternals({
        allowlist: [/^(?!(livereload|concurrently|fsevents)).*/]
      })
    );

    config.optimization = {
      minimize: config.mode === 'production',
      minimizer: [
        (compiler) => {
          new TerserPlugin({
            terserOptions: {
              mangle: false,
              ecma: 2017,
              keep_classnames: true,
              toplevel: true,
              ie8: false
            }
          }).apply(compiler);
        }
      ],
      moduleIds: config.mode === 'production' ? 'deterministic' : 'named',
      chunkIds: config.mode === 'production' ? 'deterministic' : 'named',
      removeAvailableModules: true,
      mergeDuplicateChunks: true,
      mangleExports: false
    };

    config.plugins?.push(
      new IgnorePlugin({
        checkResource: (resource: string) => {
          const lazyImports = [
            '@nestjs/microservices',
            '@nestjs/microservices/microservices-module',
            '@nestjs/websockets/socket-module',
            'cache-manager',
            'class-validator',
            'class-transform',
            'apollo-server-fastify',
            'bufferutil',
            'utf-8-validate',
            'graphql-ws',
            'react'
          ];

          if (!lazyImports.includes(resource)) {
            return false;
          }

          try {
            require.resolve(resource);
          } catch (_err: any) {
            return true;
          }
          return false;
        }
      })
    );
  }

  return config;
};
