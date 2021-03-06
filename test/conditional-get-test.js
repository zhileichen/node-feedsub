const FeedSub = require('..');
const nock    = require('nock');
const sinon   = require('sinon');
const assert  = require('assert');
const path    = require('path');


const rss2old = path.join(__dirname, 'assets', 'rss2old.xml');


describe('Conditional GET', () => {
  var host = 'http://feedburner.info';
  var path = '/rss';
  var reader = new FeedSub(host + path, { emitOnStart: true });
  var itemSpy = sinon.spy();
  var itemsSpy = sinon.spy();

  reader.on('item', itemSpy);
  reader.on('items', itemsSpy);

  // Reply with headers.
  var now = new Date().toGMTString();
  var etag = '"asdfghjklpoiuytrewq"';
  var headers = { 'last-modified': now, 'etag': etag };
  nock(host)
    .get(path)
    .replyWithFile(200, rss2old, headers);

  it('Read all items in feed', (done) => {
    reader.read((err, items) => {
      if (err) return done(err);

      assert.ok(Array.isArray(items));
      assert.equal(items.length, 4);

      assert.equal(itemSpy.callCount, 4);
      assert.equal(itemsSpy.callCount, 1);

      assert.equal(reader.getOpts.headers['If-Modified-Since'], now);
      assert.equal(reader.getOpts.headers['If-None-Match'], etag);

      itemSpy.resetHistory();
      itemsSpy.resetHistory();

      done();
    });
  });


  describe('Read feed again', () => {
    nock(host)
      .get(path)
      .matchHeader('if-modified-since', now)
      .matchHeader('if-none-match', etag)
      .replyWithFile(304, rss2old, headers);

    it('Should not return any new items', (done) => {
      reader.read((err, items) => {
        if (err) return done(err);

        assert.ok(Array.isArray(items));
        assert.equal(items.length, 0);

        assert.equal(itemSpy.callCount, 0);
        assert.equal(itemsSpy.callCount, 1);

        done();
      });
    });

  });
});
