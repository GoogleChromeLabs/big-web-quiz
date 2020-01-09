/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { h, FunctionalComponent, JSX } from 'preact';

const Select: FunctionalComponent<JSX.HTMLAttributes> = props => {
  const { class: className, ...selectProps } = props;

  return (
    <div class={'select' + (className ? ' ' + className : '')}>
      <select {...selectProps}></select>
      <div class="select-icon">
        <svg class="fill-current h-4 w-4" viewBox="0 0 20 20">
          <path d="M9.3 13l.7.7L15.7 8l-1.5-1.4-4.2 4.2-4.2-4.2L4.3 8z" />
        </svg>
      </div>
    </div>
  );
};

export default Select;
