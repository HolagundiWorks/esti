# Third-Party Notices — ESTI AORMS

ESTI AORMS (the "Software") is proprietary (see LICENSE) and incorporates the
third-party open-source components listed below. Each remains governed by its own
license. This manifest is reproducible with `pnpm licenses list --prod` (Node) and
`pip-licenses` (Python worker).

All Node/TypeScript dependencies are permissive (MIT, Apache-2.0, BSD, ISC, 0BSD,
BlueOak-1.0.0; fonts under OFL-1.1; one file-level "MPL-2.0 OR Apache-2.0").
The Python worker additionally uses psycopg and, via WeasyPrint, Pango/cairo under
the LGPL as dynamically-linked libraries used server-side — no source-disclosure
obligation is triggered for SaaS operation.

Full license texts ship inside each package under node_modules/<pkg>/LICENSE.

## npm dependencies (frontend + backend, production)

### (MPL-2.0 OR Apache-2.0)

### 0BSD
- tslib

### Apache-2.0
- @carbon/colors
- @carbon/feature-flags
- @carbon/grid
- @carbon/icon-helpers
- @carbon/icons-react
- @carbon/layout
- @carbon/motion
- @carbon/react
- @carbon/styles
- @carbon/themes
- @carbon/type
- @carbon/utilities
- @ibm/telemetry-js
- @internationalized/number
- @swc/helpers
- adler-32
- cfb
- cluster-key-slot
- codepage
- crc-32
- denque
- detect-libc
- drizzle-orm
- frac
- minio
- ssf
- typescript
- wmf
- word
- xlsx

### BSD-3-Clause
- d3-array
- d3-path
- d3-shape
- fast-uri
- light-my-request
- rw
- secure-json-parse
- source-map-js
- stream-chain
- stream-json

### BlueOak-1.0.0
- sax

### ISC
- d3
- d3-array
- d3-color
- d3-format
- d3-geo
- d3-interpolate
- d3-path
- d3-scale
- d3-shape
- d3-time
- d3-time-format
- d3-timer
- fastq
- inherits
- internmap
- semver
- split2

### MIT
- @babel/runtime
- @dnd-kit/accessibility
- @dnd-kit/core
- @dnd-kit/utilities
- @fastify/ajv-compiler
- @fastify/busboy
- @fastify/cookie
- @fastify/deepmerge
- @fastify/error
- @fastify/fast-json-stringify-compiler
- @fastify/merge-json-schemas
- @fastify/multipart
- @fastify/rate-limit
- @floating-ui/core
- @floating-ui/dom
- @floating-ui/react
- @floating-ui/react-dom
- @floating-ui/utils
- @ioredis/commands
- @lukeed/ms
- @nodable/entities
- @node-rs/argon2
- @node-rs/argon2-linux-x64-gnu
- @node-rs/argon2-linux-x64-musl
- @parcel/watcher
- @parcel/watcher-linux-x64-glibc
- @parcel/watcher-linux-x64-musl
- @pinojs/redact
- @remix-run/router
- @tanstack/query-core
- @tanstack/react-query
- @trpc/client
- @trpc/react-query
- @trpc/server
- @types/d3
- @types/d3-array
- @types/d3-color
- @types/d3-format
- @types/d3-geo
- @types/d3-interpolate
- @types/d3-path
- @types/d3-scale
- @types/d3-shape
- @types/d3-time
- @types/d3-time-format
- @types/d3-timer
- @types/geojson
- @types/prop-types
- @types/react
- abstract-logging
- ajv
- ajv-formats
- async
- atomic-sleep
- avvio
- block-stream2
- browser-or-node
- buffer-crc32
- chokidar
- classnames
- color
- color-convert
- color-name
- color-string
- compute-scroll-into-view
- cookie
- cookie-signature
- copy-to-clipboard
- csstype
- date-fns
- debug
- decode-uri-component
- downshift
- es-toolkit
- eventemitter3
- fast-content-type-parse
- fast-decode-uri-component
- fast-deep-equal
- fast-json-stringify
- fast-querystring
- fast-uri
- fast-xml-builder
- fast-xml-parser
- fastify
- fastify-plugin
- filter-obj
- find-my-way
- flatpickr
- forwarded
- immutable
- invariant
- ioredis
- ipaddr.js
- is-arrayish
- is-extglob
- is-glob
- js-tokens
- json-schema-ref-resolver
- json-schema-traverse
- lodash
- loose-envify
- marked
- mime-db
- mime-types
- ms
- node-addon-api
- object-assign
- on-exit-leak-free
- path-expression-matcher
- picomatch
- pino
- pino-abstract-transport
- pino-std-serializers
- process-warning
- prop-types
- proxy-addr
- query-string
- quick-format-unescaped
- react
- react-dom
- react-fast-compare
- react-is
- react-router
- react-router-dom
- readable-stream
- readdirp
- real-require
- redis-errors
- redis-parser
- require-from-string
- ret
- reusify
- rfdc
- safe-buffer
- safe-regex2
- safe-stable-stringify
- sass
- scheduler
- set-cookie-parser
- simple-swizzle
- sonic-boom
- split-on-first
- standard-as-callback
- stream-wormhole
- strict-uri-encode
- string_decoder
- strnum
- tabbable
- thread-stream
- through2
- toad-cache
- toggle-selection
- util-deprecate
- xml-naming
- xml2js
- xmlbuilder
- zod
- zustand

### OFL-1.1
- @ibm/plex
- @ibm/plex-mono
- @ibm/plex-sans
- @ibm/plex-sans-arabic
- @ibm/plex-sans-devanagari
- @ibm/plex-sans-hebrew
- @ibm/plex-sans-thai
- @ibm/plex-sans-thai-looped
- @ibm/plex-serif

### Unlicense
- postgres

