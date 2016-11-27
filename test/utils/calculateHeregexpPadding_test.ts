import verifyStringMatchesCoffeeScript from './verifyStringMatchesCoffeeScript.js';
import { suite, test } from 'mocha-typescript';

@suite class calculateHeregexpPaddingTest {
  @test 'removes whitespace from single-line heregexes'() {
    verifyStringMatchesCoffeeScript(`///a b///`, ['ab']);
  }

  @test 'handles heregexp comments'() {
    verifyStringMatchesCoffeeScript(`///
    b  # foo
    c
    ///`, ['bc']);
  }

  @test 'does not treat # as a comment if it is preceded by non-whitespace'() {
    verifyStringMatchesCoffeeScript(`///
    b# foo
    c
    ///`, ['b#fooc']);
  }

  @test 'handles interpolations within heregexes'() {
    verifyStringMatchesCoffeeScript(`///
    a  #{b}
    c
    ///`, ['a', 'c']);
  }

  @test 'allows interpolations in comments and ends the comment at the interpolation'() {
    verifyStringMatchesCoffeeScript(`///
    a #b #{c}d
    e
    ///`, ['a', 'de']);
  }

  @test 'allows escaped spaces in heregexes'() {
    verifyStringMatchesCoffeeScript(`///
    a \\ b #{c}d
    e
    ///`, ['a b', 'de']);
  }

  @test 'does not escape a space on a double backslash'() {
    verifyStringMatchesCoffeeScript(`///
    a \\\\ b #{c}d
    e
    ///`, ['a\\\\\\\\b', 'de']);
  }

  @test 'escapes a space on a triple backslash'() {
    verifyStringMatchesCoffeeScript(`///
    a \\\\\\ b #{c}d
    e
    ///`, ['a\\\\\\\\ b', 'de']);
  }

  @test 'handles a hergexp consisting of only a backslash'() {
    verifyStringMatchesCoffeeScript(`///
    \\a
    ///`, ['\\\\a']);
  }
}
