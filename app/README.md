This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

To start the development server, use:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API server

On production, the API server is https://api.bringyour.com. However, if you try to communicate with this API when running locally, you will run into a CORS error.

To solve this problem, the development build is configured to communicate with http://test.bringyour.com, which proxies through to https://api.bringyour.com. To make this setup work, you will need to the following:

1. To `/etc/hosts` add:
```
127.0.0.1  test.bringyour.com
```

1. Run an nginx server locally with the following config:
```
http {
    server {
        listen       80;
        listen       443;
        server_name  test.bringyour.com;

        location / {
            proxy_set_header Referer https://bringyour.com;
            proxy_set_header Origin https://bringyour.com;
            proxy_pass https://api.bringyour.com;
            proxy_hide_header 'access-control-allow-origin';
            add_header Access-Control-Allow-Origin http://localhost:3000;
        }
    }
}
```

## Building for production

To create a production build use:

```bash
make build
```
or
```
npm run build
```

The build artifacts will be saved in the `web/app/build/` directory.